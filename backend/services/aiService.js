const { OpenAI } = require('openai');
const Job = require('../models/job');
const logger = require('../logger');
const { emitJobUpdate } = require('../websocket');
const genreInstructions = require('../shared/genreInstructions');

class AIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    this.activeJobs = new Map();
    
    // Cost tracking per model (prices as of 2024)
    // Model limits: gpt-4o/gpt-4o-mini context: 128K tokens, output: 16K tokens
    // For novel generation, we prioritize quality over artificial token limits
    this.costTracking = {
      'gpt-4o': {
        inputCost: 0.005,  // $0.005 per 1K tokens
        outputCost: 0.015  // $0.015 per 1K tokens
      },
      'gpt-4o-mini': {
        inputCost: 0.00015, // $0.00015 per 1K tokens
        outputCost: 0.0006  // $0.0006 per 1K tokens
      }
    };
  }
  
  async generateNovel(jobId) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    
    // Add to active jobs
    this.activeJobs.set(jobId, {
      startTime: Date.now(),
      status: 'planning'
    });
    
    try {
      // Phase 1: Premise Analysis
      await this.analyzePremise(jobId);
      
      // Phase 2: Generate Outline
      await this.generateOutline(jobId);
      
      // Phase 3: Generate All Chapters
      await this.generateAllChapters(jobId);
      
      // Mark job as completed
      job.status = 'completed';
      job.currentPhase = 'completed';
      job.progress.lastActivity = new Date();
      await job.save();
      
      // Remove from active jobs
      this.activeJobs.delete(jobId);
      
      emitJobUpdate(jobId, {
        status: 'completed',
        currentPhase: 'completed',
        message: 'Novel generation completed successfully!'
      });
      
      logger.info(`Completed novel generation for job ${jobId}`);
      
    } catch (error) {
      await this.handleGenerationError(jobId, error);
    }
  }
  
  async analyzePremise(jobId) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    
    job.status = 'planning';
    job.currentPhase = 'premise_analysis';
    job.progress.lastActivity = new Date();
    await job.save();
    
    emitJobUpdate(jobId, {
      status: job.status,
      currentPhase: job.currentPhase,
      message: 'Analyzing premise and planning structure...'
    });
    
    try {
      const analysisStart = Date.now();
      
      // Get genre-specific instructions
      const genreInstruction = genreInstructions[job.genre]?.[job.subgenre];
      if (!genreInstruction) {
        throw new Error(`Unsupported genre combination: ${job.genre}/${job.subgenre}`);
      }
      
      const analysisPrompt = `
Analyze this novel premise and provide structural recommendations:

PREMISE: "${job.premise}"

GENRE: ${job.genre.replace(/_/g, ' ')}
SUBGENRE: ${job.subgenre.replace(/_/g, ' ')}
TARGET WORD COUNT: ${job.targetWordCount}
TARGET CHAPTERS: ${job.targetChapters}

GENRE GUIDELINES:
${genreInstruction}

Please provide:
1. Theme analysis
2. Character archetypes needed
3. Plot structure recommendations
4. Key story beats for this genre
5. Potential subplots
6. Tone and style guidance

Respond in JSON format:
{
  "themes": ["theme1", "theme2"],
  "characters": ["character_type1", "character_type2"],
  "plotStructure": "three-act/hero-journey/etc",
  "keyBeats": ["beat1", "beat2"],
  "subplots": ["subplot1", "subplot2"],
  "tone": "description",
  "styleNotes": "guidance"
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.3,
        max_tokens: 4000 // Increased for detailed analysis
      });
      
      const analysisResult = this.extractJSON(response.choices[0].message.content);
      
      // Calculate cost
      const cost = this.calculateCost(
        'gpt-4o-mini',
        response.usage.prompt_tokens,
        response.usage.completion_tokens
      );
      
      // Update job with analysis
      job.analysis = analysisResult;
      job.modelUsage.premiseAnalysis = {
        model: 'gpt-4o-mini',
        tokensUsed: response.usage.total_tokens,
        cost: cost,
        duration: Date.now() - analysisStart
      };
      
      await job.save();
      
      logger.info(`Completed premise analysis for job ${jobId}`);
      
    } catch (error) {
      throw new Error(`Premise analysis failed: ${error.message}`);
    }
  }
  
  async generateOutline(jobId) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    
    job.status = 'outlining';
    job.currentPhase = 'outline_generation';
    job.progress.lastActivity = new Date();
    await job.save();
    
    emitJobUpdate(jobId, {
      status: job.status,
      currentPhase: job.currentPhase,
      message: 'Creating detailed chapter outline...'
    });
    
    try {
      const outlineStart = Date.now();
      
      const outlinePrompt = `
Create a ${job.targetChapters}-chapter outline for "${job.title}" (${job.genre.replace(/_/g, ' ')} - ${job.subgenre.replace(/_/g, ' ')}).

PREMISE: ${job.premise}
WORD COUNT: ${job.targetWordCount} total (~${Math.round(job.targetWordCount / job.targetChapters)} per chapter)

ANALYSIS: ${JSON.stringify(job.analysis, null, 1)}

Create exactly ${job.targetChapters} chapters with concise but detailed descriptions.

JSON format:
{
  "outline": [
    {
      "number": 1,
      "title": "Chapter Title",
      "summary": "Key events and plot progression",
      "keyEvents": ["event1", "event2", "event3"],
      "characters": ["char1", "char2"],
      "targetWordCount": ${Math.round(job.targetWordCount / job.targetChapters)}
    }
  ]
}`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: outlinePrompt }],
        temperature: 0.4,
        max_tokens: Math.max(16000, job.targetChapters * 400) // No arbitrary upper limit, scale with needs
      });
      
      const outlineResult = this.extractJSON(response.choices[0].message.content);
      
      // Calculate cost
      const cost = this.calculateCost(
        'gpt-4o-mini',
        response.usage.prompt_tokens,
        response.usage.completion_tokens
      );
      
      // Update job with outline
      job.outline = outlineResult.outline;
      job.progress.outlineComplete = true;
      job.modelUsage.outlineGeneration = {
        model: 'gpt-4o-mini',
        tokensUsed: response.usage.total_tokens,
        cost: cost,
        duration: Date.now() - outlineStart
      };
      
      await job.save();
      
      emitJobUpdate(jobId, {
        status: job.status,
        currentPhase: job.currentPhase,
        progress: {
          ...job.progress,
          outlineComplete: true
        },
        message: 'Outline completed. Starting chapter generation...'
      });
      
      logger.info(`Completed outline generation for job ${jobId}`);
      
    } catch (error) {
      throw new Error(`Outline generation failed: ${error.message}`);
    }
  }
  
  async generateAllChapters(jobId) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    
    if (!job.outline || job.outline.length === 0) {
      throw new Error(`No outline found for job ${jobId}`);
    }
    
    job.status = 'writing';
    job.currentPhase = 'chapter_writing';
    job.progress.lastActivity = new Date();
    await job.save();
    
    emitJobUpdate(jobId, {
      status: job.status,
      currentPhase: job.currentPhase,
      message: 'Starting chapter generation...'
    });
    
    const chapterGenerationStart = Date.now();
    let totalTokensUsed = 0;
    let totalCost = 0;
    let totalAttempts = 0;
    
    // Generate chapters sequentially to avoid race conditions
    for (let i = 0; i < job.outline.length; i++) {
      const chapterOutline = job.outline[i];
      const chapterNumber = chapterOutline.number;
      
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
        totalAttempts += chapter.attempts || 1;
        
        // Calculate estimated completion time
        const timePerChapter = (Date.now() - chapterGenerationStart) / job.chapters.length;
        const chaptersRemaining = job.targetChapters - job.chapters.length;
        const estimatedTimeRemaining = timePerChapter * chaptersRemaining;
        job.progress.estimatedCompletion = new Date(Date.now() + estimatedTimeRemaining);
        
        // Save after each chapter to prevent data loss
        await job.save();
        
        // Small delay to prevent MongoDB race conditions
        await new Promise(resolve => setTimeout(resolve, 100));
        
        emitJobUpdate(jobId, {
          currentPhase: 'chapter_writing',
          progress: {
            chaptersCompleted: job.chapters.length,
            totalChapters: job.targetChapters,
            estimatedCompletion: job.progress.estimatedCompletion
          },
          message: `Chapter ${chapterNumber} completed. ${job.chapters.length}/${job.targetChapters} chapters done.`
        });
        
      } catch (error) {
        logger.error(`Error generating chapter ${chapterNumber} for job ${jobId}:`, error);
        
        // Try to continue with next chapter after error
        totalAttempts++;
        
        // If too many failures, abort
        if (totalAttempts > job.targetChapters * 0.5) {
          throw new Error(`Too many chapter generation failures for job ${jobId}`);
        }
      }
    }
    
    // Update job with final chapter generation stats
    job.modelUsage.chapterGeneration = {
      model: 'gpt-4o',
      tokensUsed: totalTokensUsed,
      cost: totalCost,
      attempts: totalAttempts,
      duration: Date.now() - chapterGenerationStart
    };
    
    // Calculate quality metrics
    if (job.chapters.length > 0) {
      const averageChapterLength = job.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0) / job.chapters.length;
      const totalWordCount = job.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);
      
      job.qualityMetrics = {
        averageChapterLength: Math.round(averageChapterLength),
        totalWordCount: totalWordCount,
        targetAccuracy: Math.round((totalWordCount / job.targetWordCount) * 100),
        chaptersCompleted: job.chapters.length,
        completionRate: Math.round((job.chapters.length / job.targetChapters) * 100)
      };
    }
    
    job.progress.lastActivity = new Date();
    await job.save();
    
    // Check cost alert
    if (totalCost > parseFloat(process.env.COST_ALERT_THRESHOLD || '25.00')) {
      logger.warn(`Cost alert: Job ${jobId} exceeded threshold with $${totalCost.toFixed(4)}`);
    }
    
    logger.info(`Completed generating all chapters for job ${jobId}`);
  }
  
  async generateChapter(jobId, chapterNumber, chapterOutline) {
    const job = await Job.findById(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    
    const maxAttempts = 3;
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const chapterStart = Date.now();
        
        // Get genre-specific instructions
        const genreInstruction = genreInstructions[job.genre]?.[job.subgenre];
        
        const chapterPrompt = `
Write Chapter ${chapterNumber} of the novel "${job.title}".

CHAPTER OUTLINE:
Title: ${chapterOutline.title}
Summary: ${chapterOutline.summary}
Key Events: ${chapterOutline.keyEvents.join(', ')}
Target Word Count: ${chapterOutline.targetWordCount}

NOVEL CONTEXT:
Premise: "${job.premise}"
Genre: ${job.genre.replace(/_/g, ' ')} - ${job.subgenre.replace(/_/g, ' ')}
Previous chapters: ${job.chapters.length > 0 ? job.chapters.slice(-3).map(ch => `Ch${ch.number}: ${ch.title} (${ch.wordCount}w)`).join('; ') : 'This is the first chapter'}
Story progress: Chapter ${chapterNumber} of ${job.targetChapters} total

GENRE GUIDELINES:
${genreInstruction}

ANALYSIS CONTEXT:
${job.targetChapters > 20 ? 
  `Key themes: ${job.analysis.themes?.join(', ') || 'N/A'}
Main characters: ${job.analysis.characters?.join(', ') || 'N/A'}` :
  JSON.stringify(job.analysis, null, 1)}

Write the complete chapter with:
- Engaging prose appropriate to the genre
- Proper dialogue and action
- Character development
- Scene descriptions
- Approximately ${chapterOutline.targetWordCount} words

Write only the chapter content, no metadata or formatting.`;

        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [{ role: 'user', content: chapterPrompt }],
          temperature: 0.7,
          max_tokens: Math.max(4000, Math.round(chapterOutline.targetWordCount * 1.8)) // Higher multiplier for richer content
        });
        
        const chapterContent = response.choices[0].message.content.trim();
        const wordCount = this.countWords(chapterContent);
        
        // Calculate cost
        const cost = this.calculateCost(
          'gpt-4o',
          response.usage.prompt_tokens,
          response.usage.completion_tokens
        );
        
        // Create chapter object
        const chapter = {
          number: chapterNumber,
          title: chapterOutline.title,
          content: chapterContent,
          wordCount: wordCount,
          tokensUsed: response.usage.total_tokens,
          cost: cost,
          attempts: attempts,
          generationTime: Date.now() - chapterStart
        };
        
        logger.info(`Generated chapter ${chapterNumber} for job ${jobId} (${wordCount} words, attempt ${attempts})`);
        
        return chapter;
        
      } catch (error) {
        logger.error(`Attempt ${attempts} failed for chapter ${chapterNumber} in job ${jobId}:`, error);
        
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to generate chapter ${chapterNumber} after ${maxAttempts} attempts: ${error.message}`);
        }
        
        // Exponential backoff
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempts) * 1000));
      }
    }
  }
  
  async resumeChapterGeneration(jobId, startFromChapter = 1) {
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
      // Find chapters that need to be generated
      const existingChapterNumbers = job.chapters.map(ch => ch.number);
      const chaptersToGenerate = job.outline.filter(outline => 
        outline.number >= startFromChapter && !existingChapterNumbers.includes(outline.number)
      );
      
      for (const chapterOutline of chaptersToGenerate) {
        const chapter = await this.generateChapter(jobId, chapterOutline.number, chapterOutline);
        job.chapters.push(chapter);
        job.progress.chaptersCompleted = job.chapters.length;
        job.progress.lastActivity = new Date();
        await job.save();
        
        emitJobUpdate(jobId, {
          currentPhase: 'chapter_writing',
          progress: {
            chaptersCompleted: job.chapters.length,
            totalChapters: job.targetChapters
          },
          message: `Chapter ${chapterOutline.number} completed. ${job.chapters.length}/${job.targetChapters} chapters done.`
        });
      }
      
      // Check if all chapters are complete
      if (job.chapters.length >= job.targetChapters) {
        job.status = 'completed';
        job.currentPhase = 'completed';
        await job.save();
        
        this.activeJobs.delete(jobId);
        
        emitJobUpdate(jobId, {
          status: 'completed',
          currentPhase: 'completed',
          message: 'Novel generation completed successfully!'
        });
      }
      
      logger.info(`Completed resuming chapter generation for job ${jobId}`);
      
    } catch (error) {
      await this.handleGenerationError(jobId, error);
    }
  }
  
  async handleOpenAIError(error, jobId, phase) {
    logger.error(`OpenAI API error in ${phase} for job ${jobId}:`, error);
    
    // Handle specific OpenAI API errors with appropriate strategies
    if (error.status === 429) {
      // Rate limit error - implement exponential backoff
      logger.warn(`Rate limit hit for job ${jobId}, will retry with backoff`);
      return true;
    } else if (error.status === 500 || error.status === 503) {
      // Server error - retry with backoff
      logger.warn(`OpenAI server error for job ${jobId}, will retry`);
      return true;
    } else if (error.status === 400 && error.message?.includes('context_length_exceeded')) {
      // Context length error - need to reduce input
      logger.error(`Context length exceeded for job ${jobId}, cannot retry`);
      return false;
    } else if (error.status === 401) {
      // Authentication error
      logger.error(`Invalid API key for job ${jobId}`);
      return false;
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
        // Keep the current phase instead of setting invalid 'error'
        job.error = {
          message: error.message,
          phase: phase || job.currentPhase,
          timestamp: new Date()
        };
        job.progress.lastActivity = new Date();
        await job.save();
        
        emitJobUpdate(jobId, {
          status: 'failed',
          currentPhase: job.currentPhase,
          error: error.message,
          message: `Generation failed: ${error.message}`
        });
      }
      
      // Remove from active jobs
      this.activeJobs.delete(jobId);
      
    } catch (dbError) {
      logger.error(`Error updating job ${jobId} after generation error:`, dbError);
    }
  }
  
  calculateCost(model, promptTokens, completionTokens) {
    const rates = this.costTracking[model];
    if (!rates) return 0;
    
    return (promptTokens * rates.inputCost / 1000) + (completionTokens * rates.outputCost / 1000);
  }
  
  countWords(text) {
    if (!text || typeof text !== 'string') return 0;
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
  
  // Extract JSON from OpenAI response that may contain extra text
  extractJSON(content) {
    if (!content) throw new Error('Empty response from OpenAI');
    
    try {
      // First try direct JSON parsing
      return JSON.parse(content);
    } catch (error) {
      // Look for JSON within the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (innerError) {
          logger.error('Failed to parse extracted JSON:', jsonMatch[0]);
          throw new Error(`Invalid JSON in response: ${innerError.message}`);
        }
      }
      
      logger.error('No valid JSON found in OpenAI response:', content);
      throw new Error('OpenAI response does not contain valid JSON');
    }
  }
  
  // Get active job status
  getActiveJobStatus(jobId) {
    return this.activeJobs.get(jobId) || null;
  }
  
  // Get all active jobs
  getActiveJobs() {
    return Array.from(this.activeJobs.entries()).map(([jobId, status]) => ({
      jobId,
      ...status
    }));
  }
}

module.exports = new AIService();
