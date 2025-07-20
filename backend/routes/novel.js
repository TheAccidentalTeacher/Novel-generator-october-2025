const express = require('express');
const multer = require('multer');
const { body, validationResult } = require('express-validator');
const Job = require('../models/job');
const aiService = require('../services/aiService');
const logger = require('../logger');
const genreInstructions = require('../shared/genreInstructions');

const router = express.Router();

// Configure multer for premise file uploads
const upload = multer({
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    fieldSize: 10 * 1024 * 1024 // 10MB field limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/plain' || file.mimetype === 'text/markdown') {
      cb(null, true);
    } else {
      cb(new Error('Only .txt and .md files are allowed'));
    }
  }
});

// Validation middleware for novel generation
const validateNovelGeneration = [
  body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
  body('premise').isLength({ min: 50, max: 10000 }).withMessage('Premise must be 50-10,000 characters'),
  body('genre').isIn(Object.keys(genreInstructions)).withMessage('Invalid genre'),
  body('targetWordCount').isInt({ min: 20000, max: 200000 }).withMessage('Target word count must be 20,000-200,000'),
  body('targetChapters').isInt({ min: 5, max: 50 }).withMessage('Target chapters must be 5-50'),
  body('subgenre').custom((value, { req }) => {
    const genre = req.body.genre;
    if (genre && genreInstructions[genre] && !genreInstructions[genre][value]) {
      throw new Error('Invalid subgenre for selected genre');
    }
    return true;
  })
];

// GET /api/novel/genres - Get available genres and subgenres
router.get('/genres', (req, res) => {
  try {
    const genres = Object.keys(genreInstructions).map(genreName => ({
      name: genreName,
      displayName: genreName.replace(/_/g, ' '),
      subgenres: Object.keys(genreInstructions[genreName]).map(subgenreName => ({
        name: subgenreName,
        displayName: subgenreName.replace(/_/g, ' '),
        description: genreInstructions[genreName][subgenreName]
      }))
    }));
    
    res.json(genres);
  } catch (error) {
    logger.error('Error fetching genres:', error);
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
});

// POST /api/novel/generate - Start novel generation
router.post('/generate', validateNovelGeneration, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: errors.array() 
      });
    }

    const { title, premise, genre, subgenre, targetWordCount, targetChapters } = req.body;

    // Create new job
    const job = new Job({
      title,
      premise,
      genre,
      subgenre,
      targetWordCount,
      targetChapters,
      progress: {
        totalChapters: targetChapters
      }
    });

    await job.save();
    logger.info(`Created new novel generation job: ${job._id}`);

    // Start generation process asynchronously
    aiService.generateNovel(job._id.toString()).catch(error => {
      logger.error(`Error in async novel generation for job ${job._id}:`, error);
    });

    res.status(202).json({
      message: 'Novel generation started',
      jobId: job._id.toString()
    });

  } catch (error) {
    logger.error('Error creating novel generation job:', error);
    res.status(500).json({ error: 'Failed to start novel generation' });
  }
});

// POST /api/novel/upload-premise - Upload premise from file
router.post('/upload-premise', upload.single('premise'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const premise = req.file.buffer.toString('utf-8');
    
    if (premise.length < 50) {
      return res.status(400).json({ error: 'Premise too short (minimum 50 characters)' });
    }
    
    if (premise.length > 10000) {
      return res.status(400).json({ error: 'Premise too long (maximum 10,000 characters)' });
    }

    res.json({ premise });
    
  } catch (error) {
    logger.error('Error uploading premise:', error);
    res.status(500).json({ error: 'Failed to upload premise' });
  }
});

// GET /api/novel/status/:jobId - Get job status and progress
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({
      jobId: job._id,
      status: job.status,
      currentPhase: job.currentPhase,
      progress: job.progress,
      title: job.title,
      genre: job.genre,
      subgenre: job.subgenre,
      targetWordCount: job.targetWordCount,
      targetChapters: job.targetChapters,
      outline: job.outline,
      chapters: job.chapters.map(chapter => ({
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        wordCount: chapter.wordCount,
        generatedAt: chapter.generatedAt
      })),
      modelUsage: job.modelUsage,
      qualityMetrics: job.qualityMetrics,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      completedAt: job.completedAt
    });

  } catch (error) {
    logger.error('Error fetching job status:', error);
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

// GET /api/novel/download/:jobId - Download completed novel
router.get('/download/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status !== 'completed') {
      return res.status(400).json({ error: 'Novel generation not completed' });
    }

    // Calculate total word count
    const totalWordCount = job.chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);

    res.json({
      title: job.title,
      genre: job.genre,
      subgenre: job.subgenre,
      premise: job.premise,
      wordCount: totalWordCount,
      chapters: job.chapters.map(chapter => ({
        number: chapter.chapterNumber,
        title: chapter.title,
        content: chapter.content,
        wordCount: chapter.wordCount
      })),
      outline: job.outline,
      modelUsage: job.modelUsage,
      qualityMetrics: job.qualityMetrics,
      generatedAt: job.completedAt || job.updatedAt
    });

  } catch (error) {
    logger.error('Error downloading novel:', error);
    res.status(500).json({ error: 'Failed to download novel' });
  }
});

// GET /api/novel/jobs - Get all jobs (for admin/debugging)
router.get('/jobs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const jobs = await Job.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('_id title status currentPhase progress createdAt updatedAt completedAt');

    const total = await Job.countDocuments();

    res.json({
      jobs,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Error fetching jobs list:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// DELETE /api/novel/job/:jobId - Delete a job (for cleanup)
router.delete('/job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = await Job.findByIdAndDelete(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    logger.info(`Deleted job: ${jobId}`);
    res.json({ message: 'Job deleted successfully' });

  } catch (error) {
    logger.error('Error deleting job:', error);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// POST /api/novel/resume/:jobId - Resume failed generation
router.post('/resume/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    if (job.status === 'completed') {
      return res.status(400).json({ error: 'Job already completed' });
    }

    if (job.status === 'writing' || job.status === 'outlining') {
      return res.status(400).json({ error: 'Job is already in progress' });
    }

    // Resume generation
    logger.info(`Resuming generation for job: ${jobId}`);
    aiService.resumeGeneration(jobId).catch(error => {
      logger.error(`Error resuming generation for job ${jobId}:`, error);
    });

    res.json({ message: 'Generation resumed' });

  } catch (error) {
    logger.error('Error resuming job:', error);
    res.status(500).json({ error: 'Failed to resume generation' });
  }
});

module.exports = router;
