const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const Job = require('../models/job');

// Get quality metrics for a job
router.get('/quality-metrics/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID format' });
    }
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const metrics = job.metadata?.qualityMetrics || {
      humanLikenessScore: 0.75,
      complexityScore: 0.70,
      consistencyScore: 0.80,
      creativityScore: 0.65
    };

    res.json({ metrics });
  } catch (error) {
    console.error('Error fetching quality metrics:', error);
    res.status(500).json({ error: 'Failed to fetch quality metrics' });
  }
});

// Get story bible for a job
router.get('/story-bible/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID format' });
    }
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const storyBible = job.metadata?.storyBible || {
      characters: {},
      plotThreads: [],
      timeline: [],
      locations: {},
      themes: []
    };

    res.json({ storyBible });
  } catch (error) {
    console.error('Error fetching story bible:', error);
    res.status(500).json({ error: 'Failed to fetch story bible' });
  }
});

// Get continuity alerts for a job
router.get('/continuity-alerts/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID format' });
    }
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const alerts = job.metadata?.continuityAlerts || [];
    res.json({ alerts });
  } catch (error) {
    console.error('Error fetching continuity alerts:', error);
    res.status(500).json({ error: 'Failed to fetch continuity alerts' });
  }
});

// Get AI decisions for a job
router.get('/ai-decisions/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID format' });
    }
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const decisions = job.metadata?.aiDecisions || [];
    res.json({ decisions });
  } catch (error) {
    console.error('Error fetching AI decisions:', error);
    res.status(500).json({ error: 'Failed to fetch AI decisions' });
  }
});

// Kill a specific job
router.post('/kill-job/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
      return res.status(400).json({ error: 'Invalid job ID format' });
    }
    
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    job.status = 'failed';
    job.currentPhase = 'cancelled';
    job.error = 'Job manually cancelled by user';
    job.progress.lastActivity = new Date();
    await job.save();

    res.json({ 
      success: true, 
      message: `Job ${jobId} has been cancelled`,
      jobStatus: 'cancelled'
    });
  } catch (error) {
    console.error('Error killing job:', error);
    res.status(500).json({ 
      error: 'Failed to kill job', 
      details: error.message
    });
  }
});

// Clean up all stuck jobs
router.post('/cleanup-all-jobs', async (req, res) => {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const stuckJobs = await Job.find({
      status: { $in: ['processing', 'planning', 'outlining', 'writing', 'pending'] },
      $or: [
        { 'progress.lastActivity': { $lt: twoHoursAgo } },
        { 'progress.lastActivity': { $exists: false } }
      ]
    });

    let cleanedCount = 0;
    for (const job of stuckJobs) {
      job.status = 'failed';
      job.currentPhase = 'cleaned_up';
      job.error = 'Job automatically cleaned up (inactive for >2 hours)';
      job.progress.lastActivity = new Date();
      await job.save();
      cleanedCount++;
    }
    
    res.json({ 
      success: true, 
      message: `Cleaned up ${cleanedCount} stuck jobs`,
      cleanedJobs: cleanedCount
    });
  } catch (error) {
    console.error('Error cleaning up jobs:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup jobs', 
      details: error.message 
    });
  }
});

module.exports = router;
