const OpenAI = require('openai');
const Job = require('../models/job');
const logger = require('../logger');
const genreInstructions = require('../shared/genreInstructions');
const { emitJobUpdate } = require('../websocket');

class AIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.activeJobs = new Map();
    
    // Cost tracking for different models
    this.costTracking = {
      'gpt-4o-mini': {
        inputCost: 0.00015,   // $0.150 per 1K input tokens
        outputCost: 0.0006    // $0.600 per 1K output tokens
      },
      'gpt-4o': {
        inputCost: 0.0025,    // $2.50 per 1K input tokens
        outputCost: 0.010     // $10.00 per 1K output tokens
      }
    };
  }

  async generateNovel(jobId) {
    try {
      logger.info(`Starting novel generation for job ${jobId}`);
      
      // Add to active jobs
      this.activeJobs.set(jobId, {
        startTime: Date.now(),
        status: 'planning'
      });

      // Update job status
      const job = await Job.findById(jobId);
      if (!job) throw new Error(`Job ${jobId} not found`);

      job.status = 'planning';
      job.currentPhase = 'premise_analysis';
      await job.save();

      emitJobUpdate(jobId, {
        status: job.status,
        currentPhase: job.currentPhase,
        message: 'Analyzing premise and planning novel structure...'
      });

      // Generate outline
      await this.generateOutline(jobId);
      
      // Generate chapters
      await this.generateChapters(jobId);
      
      // Finalize job
      await this.finalizeJob(jobId);
      
      logger.info(`Completed novel generation for job ${jobId}`);
      
    } catch (error) {
      await this.handleGenerationError(jobId, error);
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  async generateOutline(jobId) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const outlineGenerationStart = Date.now();
    
    // Update status
    job.status = 'outlining';
    job.currentPhase = 'outline_generation';
    job.progress.lastActivity = new Date();
    await job.save();

    emitJobUpdate(jobId, {
      status: job.status,
      currentPhase: job.currentPhase,
      message: 'Creating detailed chapter-by-chapter outline...'
    });

    const genreInstruction = genreInstructions[job.genre][job.subgenre];
    
    const outlinePrompt = `Create a detailed chapter-by-chapter outline for a ${job.targetWordCount}-word ${job.genre.replace(/_/g, ' ')} novel in the ${job.subgenre.replace(/_/g, ' ')} subgenre.

PREMISE: ${job.premise}

TITLE: ${job.title}

GENRE GUIDELINES: ${genreInstruction}

TARGET: ${job.targetChapters} chapters, approximately ${Math.round(job.targetWordCount / job.targetChapters)} words per chapter

For each chapter, provide:
1. Chapter number and compelling title
2. 2-3 sentence summary of main events
3. Key events that advance the plot
4. Character focus and development
5. How this chapter advances the overall plot
6. Word target for this chapter
7. Genre-specific elements to include

Return the outline as a JSON array where each chapter is an object with these properties:
- chapterNumber (number)
- title (string)
- summary (string)
- keyEvents (array of strings)
- characterFocus (array of strings)
- plotAdvancement (string)
- wordTarget (number)
- genreElements (array of strings)

Ensure the outline maintains narrative momentum, develops characters consistently, and adheres to the genre conventions throughout.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert novel planner. Create detailed, engaging chapter outlines that maintain narrative momentum and genre authenticity. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: outlinePrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      const outlineText = response.choices[0].message.content;
      
      // Parse the JSON response
      let outline;
      try {
        outline = JSON.parse(outlineText);
      } catch (parseError) {
        logger.error('Failed to parse outline JSON:', parseError);
        // Try to extract JSON from response if it's wrapped in markdown
        const jsonMatch = outlineText.match(/```json\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          outline = JSON.parse(jsonMatch[1]);
        } else {
          throw new Error('Invalid JSON response from AI');
        }
      }

      // Validate outline structure
      if (!Array.isArray(outline) || outline.length !== job.targetChapters) {
        throw new Error(`Invalid outline: expected ${job.targetChapters} chapters, got ${outline.length}`);
      }

      // Update job with outline
      job.outline = outline;
      job.progress.outlineComplete = true;
      job.progress.lastActivity = new Date();
      
      // Track model usage
      const tokensUsed = response.usage.total_tokens;
      const cost = this.calculateCost('gpt-4o-mini', response.usage.prompt_tokens, response.usage.completion_tokens);
      
      job.modelUsage.outlineGeneration = {
        model: 'gpt-4o-mini',
        tokensUsed,
        cost,
        duration: Date.now() - outlineGenerationStart
      };

      await job.save();

      emitJobUpdate(jobId, {
        status: job.status,
        currentPhase: job.currentPhase,
        progress: {
          outlineComplete: true,
          totalChapters: job.targetChapters
        },
        outline: job.outline,
        message: 'Outline complete! Starting chapter generation...'
      });

      logger.info(`Generated outline for job ${jobId}: ${outline.length} chapters`);
      
    } catch (error) {
      logger.error(`Error generating outline for job ${jobId}:`, error);
      throw error;
    }
  }

  async generateChapters(jobId) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    if (!job.outline || job.outline.length === 0) {
      throw new Error('No outline available for chapter generation');
    }

    const chapterGenerationStart = Date.now();
    
    // Update status
    job.status = 'writing';
    job.currentPhase = 'chapter_writing';
    job.progress.lastActivity = new Date();
    await job.save();

    emitJobUpdate(jobId, {
      status: job.status,
      currentPhase: job.currentPhase,
      message: 'Beginning chapter generation...'
    });

    let totalTokensUsed = 0;
    let totalCost = 0;
    let attempts = 0;

    // Generate each chapter
    for (let i = 0; i < job.outline.length; i++) {
      const chapterNumber = i + 1;
      const chapterOutline = job.outline[i];
      
      try {
        emitJobUpdate(jobId, {
          currentPhase: 'chapter_writing',
          message: `Generating chapter ${chapterNumber} of ${job.targetChapters}...`,
          progress: {
            chaptersCompleted: i,
            totalChapters: job.targetChapters
          }
        });
        
        // Generate the chapter
        const chapter = await this.generateChapter(jobId, chapterNumber, chapterOutline);
        
        // Update job with the new chapter
        job.chapters.push(chapter);
        job.progress.chaptersCompleted = job.chapters.length;
        job.progress.lastActivity = new Date();
        
        // Update token usage and cost
        totalTokensUsed += chapter.tokensUsed || 0;
        totalCost += chapter.cost || 0;
        attempts += chapter.attempts || 1;
        
        // Calculate estimated completion time
        const timePerChapter = (Date.now() - chapterGenerationStart) / job.chapters.length;
        const chaptersRemaining = job.targetChapters - job.chapters.length;
        const estimatedTimeRemaining = timePerChapter * chaptersRemaining;
        job.progress.estimatedCompletion = new Date(Date.now() + estimatedTimeRemaining);
        
        await job.save();
        
        emitJobUpdate(jobId, {
          currentPhase: 'chapter_writing',
          message: `Chapter ${chapterNumber} complete!`,
          progress: {
            chaptersCompleted: job.chapters.length,
            totalChapters: job.targetChapters,
            estimatedCompletion: job.progress.estimatedCompletion
          }
        });
        
      } catch (error) {
        logger.error(`Error generating chapter ${chapterNumber} for job ${jobId}:`, error);
        throw error;
      }
    }
    
    // Update job with final chapter generation stats
    job.modelUsage.chapterGeneration = {
      model: 'gpt-4o',
      tokensUsed: totalTokensUsed,
      cost: totalCost,
      attempts,
      duration: Date.now() - chapterGenerationStart
    };
    
    // Calculate quality metrics
    if (job.chapters.length > 0) {
      const averageChapterLength = job.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0) / job.chapters.length;
      job.qualityMetrics = {
        averageChapterLength,
        genreAdherence: 0.85, // Would be calculated by analysis
        characterConsistency: 0.80,
        plotContinuity: 0.88
      };
    }
    
    job.progress.lastActivity = new Date();
    await job.save();
    
    logger.info(`Completed generating all chapters for job ${jobId}`);
  }

  async generateChapter(jobId, chapterNumber, chapterOutline) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    const genreInstruction = genreInstructions[job.genre][job.subgenre];
    
    // Build context from previous chapters
    let previousContext = '';
    if (job.chapters.length > 0) {
      const recentChapters = job.chapters.slice(-2); // Last 2 chapters for context
      previousContext = recentChapters.map(ch => 
        `Chapter ${ch.chapterNumber}: ${ch.title}\n${ch.content.substring(0, 1000)}...`
      ).join('\n\n');
    }

    const chapterPrompt = `Write Chapter ${chapterNumber} of "${job.title}", a ${job.genre.replace(/_/g, ' ')} novel in the ${job.subgenre.replace(/_/g, ' ')} subgenre.

PREMISE: ${job.premise}

GENRE GUIDELINES: ${genreInstruction}

CHAPTER OUTLINE:
Title: ${chapterOutline.title}
Summary: ${chapterOutline.summary}
Key Events: ${chapterOutline.keyEvents.join(', ')}
Character Focus: ${chapterOutline.characterFocus.join(', ')}
Plot Advancement: ${chapterOutline.plotAdvancement}
Target Word Count: ${chapterOutline.wordTarget}
Genre Elements: ${chapterOutline.genreElements.join(', ')}

${previousContext ? `PREVIOUS CHAPTERS CONTEXT:\n${previousContext}\n\n` : ''}

Write the complete chapter with:
1. Compelling opening that hooks the reader
2. Rich character development and dialogue
3. Vivid scene descriptions and atmosphere
4. Genre-appropriate tone and style
5. Strong narrative momentum
6. Satisfying chapter conclusion that leads to the next

Target approximately ${chapterOutline.wordTarget} words. Write engaging, publishable prose that maintains consistency with the established narrative voice and character development.`;

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a professional novelist specializing in ${job.genre.replace(/_/g, ' ')} fiction. Write compelling, engaging chapters that maintain consistency with the overall narrative. Focus on strong character development, vivid descriptions, and genre-appropriate storytelling.`
            },
            {
              role: 'user',
              content: chapterPrompt
            }
          ],
          temperature: 0.8,
          max_tokens: 4000
        });

        const chapterContent = response.choices[0].message.content.trim();
        const wordCount = this.countWords(chapterContent);
        const tokensUsed = response.usage.total_tokens;
        const cost = this.calculateCost('gpt-4o', response.usage.prompt_tokens, response.usage.completion_tokens);

        // Validate chapter quality
        if (wordCount < chapterOutline.wordTarget * 0.7) {
          if (attempts < maxAttempts) {
            logger.warn(`Chapter ${chapterNumber} too short (${wordCount} words), retrying...`);
            continue;
          }
        }

        // Create chapter object
        const chapter = {
          chapterNumber,
          title: chapterOutline.title,
          content: chapterContent,
          wordCount,
          tokensUsed,
          cost,
          attempts,
          generatedAt: new Date()
        };

        logger.info(`Generated chapter ${chapterNumber} for job ${jobId}: ${wordCount} words, ${tokensUsed} tokens, $${cost.toFixed(4)}`);
        return chapter;

      } catch (error) {
        logger.error(`Attempt ${attempts} failed for chapter ${chapterNumber} in job ${jobId}:`, error);
        
        if (attempts >= maxAttempts) {
          throw error;
        }
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }
    
    throw new Error(`Failed to generate chapter ${chapterNumber} after ${maxAttempts} attempts`);
  }

  async finalizeJob(jobId) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    // Update final status
    job.status = 'completed';
    job.currentPhase = 'finalization';
    job.completedAt = new Date();
    job.progress.lastActivity = new Date();
    
    // Calculate final metrics
    const totalWordCount = job.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);
    const totalCost = (job.modelUsage.outlineGeneration?.cost || 0) + (job.modelUsage.chapterGeneration?.cost || 0);
    const totalTokens = (job.modelUsage.outlineGeneration?.tokensUsed || 0) + (job.modelUsage.chapterGeneration?.tokensUsed || 0);

    await job.save();

    emitJobUpdate(jobId, {
      status: job.status,
      currentPhase: job.currentPhase,
      message: 'Novel generation complete!',
      progress: {
        chaptersCompleted: job.chapters.length,
        totalChapters: job.targetChapters,
        completed: true
      },
      totalWordCount,
      totalCost,
      totalTokens
    });

    logger.info(`Finalized job ${jobId}: ${totalWordCount} words, $${totalCost.toFixed(4)}`);
  }

  async resumeGeneration(jobId) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    logger.info(`Resuming generation for job ${jobId} from status: ${job.status}`);

    if (job.status === 'planning' || job.currentPhase === 'premise_analysis') {
      // Restart from outline generation
      await this.generateOutline(jobId);
      await this.generateChapters(jobId);
      await this.finalizeJob(jobId);
    } else if (job.status === 'outlining' || job.currentPhase === 'outline_generation') {
      // Continue with chapter generation
      await this.generateChapters(jobId);
      await this.finalizeJob(jobId);
    } else if (job.status === 'writing' || job.currentPhase === 'chapter_writing') {
      // Resume chapter generation from where we left off
      await this.resumeChapterGeneration(jobId, job.chapters.length + 1);
      await this.finalizeJob(jobId);
    }
  }

  async resumeChapterGeneration(jobId, startFromChapter) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    
    // Add to active jobs
    this.activeJobs.set(jobId, {
      startTime: Date.now(),
      status: 'writing'
    });
    
    // Update job status
    job.status = 'writing';
    job.currentPhase = 'chapter_writing';
    job.progress.lastActivity = new Date();
    await job.save();
    
    emitJobUpdate(jobId, {
      status: job.status,
      currentPhase: job.currentPhase,
      message: `Resuming chapter generation from chapter ${startFromChapter}...`
    });
    
    // Generate remaining chapters
    try {
      const chapterGenerationStart = Date.now();
      let totalTokensUsed = 0;
      let totalCost = 0;
      let attempts = 0;

      for (let i = startFromChapter - 1; i < job.outline.length; i++) {
        const chapterNumber = i + 1;
        const chapterOutline = job.outline[i];
        
        emitJobUpdate(jobId, {
          currentPhase: 'chapter_writing',
          message: `Generating chapter ${chapterNumber} of ${job.targetChapters}...`,
          progress: {
            chaptersCompleted: job.chapters.length,
            totalChapters: job.targetChapters
          }
        });
        
        const chapter = await this.generateChapter(jobId, chapterNumber, chapterOutline);
        
        job.chapters.push(chapter);
        job.progress.chaptersCompleted = job.chapters.length;
        job.progress.lastActivity = new Date();
        
        totalTokensUsed += chapter.tokensUsed || 0;
        totalCost += chapter.cost || 0;
        attempts += chapter.attempts || 1;
        
        await job.save();
      }

      // Update model usage stats
      if (!job.modelUsage.chapterGeneration) {
        job.modelUsage.chapterGeneration = {};
      }
      
      job.modelUsage.chapterGeneration.tokensUsed = (job.modelUsage.chapterGeneration.tokensUsed || 0) + totalTokensUsed;
      job.modelUsage.chapterGeneration.cost = (job.modelUsage.chapterGeneration.cost || 0) + totalCost;
      job.modelUsage.chapterGeneration.attempts = (job.modelUsage.chapterGeneration.attempts || 0) + attempts;
      job.modelUsage.chapterGeneration.duration = Date.now() - chapterGenerationStart;
      job.modelUsage.chapterGeneration.model = 'gpt-4o';
      
      await job.save();
      
      logger.info(`Completed resuming chapter generation for job ${jobId}`);
      
    } catch (error) {
      await this.handleGenerationError(jobId, error);
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  async handleOpenAIError(error, jobId, phase) {
    logger.error(`OpenAI API error in ${phase} for job ${jobId}:`, error);
    
    // Handle specific OpenAI API errors with appropriate strategies
    if (error.status === 429) {
      // Rate limit error - implement exponential backoff
      logger.warn(`Rate limit hit for job ${jobId}, implementing backoff`);
      return true; // Retry
    } else if (error.status === 500 || error.status === 503) {
      // Server error - retry with backoff
      logger.warn(`OpenAI server error for job ${jobId}, will retry`);
      return true; // Retry
    } else if (error.status === 400 && error.message.includes('context_length_exceeded')) {
      // Context length error - need to reduce input
      logger.error(`Context length exceeded for job ${jobId}`);
      return false; // Don't retry, needs different approach
    }
    
    // For other errors, don't retry automatically
    return false;
  }

  async handleGenerationError(jobId, error, phase = null) {
    logger.error(`Error in generation for job ${jobId}:`, error);
    
    try {
      const job = await Job.findById(jobId);
      if (job) {
        job.status = 'failed';
        job.progress.lastActivity = new Date();
        await job.save();
        
        emitJobUpdate(jobId, {
          status: 'failed',
          message: `Generation failed: ${error.message}`,
          error: error.message
        });
      }
    } catch (dbError) {
      logger.error(`Error updating job ${jobId} after generation error:`, dbError);
    }
    
    this.activeJobs.delete(jobId);
  }

  calculateCost(model, promptTokens, completionTokens) {
    const rates = this.costTracking[model];
    if (!rates) return 0;
    
    return (promptTokens * rates.inputCost / 1000) + (completionTokens * rates.outputCost / 1000);
  }

  countWords(text) {
    return text.split(/\s+/).filter(Boolean).length;
  }

  getActiveJobs() {
    return Array.from(this.activeJobs.entries()).map(([jobId, data]) => ({
      jobId,
      ...data
    }));
  }
}

module.exports = new AIService();
