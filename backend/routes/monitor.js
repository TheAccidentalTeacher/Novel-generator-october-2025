const express = require('express');
const router = express.Router();
const Job = require('../models/job');
const monitoringService = require('../services/monitoringService');

// Get quality metrics for a job
router.get('/quality-metrics/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await Job.findById(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get metrics from monitoring service or job metadata
    const monitoring = monitoringService.getJobMonitoring(jobId);
    const metrics = monitoring.qualityMetrics || job.metadata?.qualityMetrics || {
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
    const job = await Job.findById(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get story bible from monitoring service or job metadata
    const monitoring = monitoringService.getJobMonitoring(jobId);
    const storyBible = monitoring.storyBible || job.metadata?.storyBible || {
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
    const job = await Job.findById(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get alerts from monitoring service or job metadata
    const monitoring = monitoringService.getJobMonitoring(jobId);
    const alerts = monitoring.continuityAlerts || job.metadata?.continuityAlerts || [];

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
    const job = await Job.findById(jobId);
    
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get decisions from monitoring service or job metadata
    const monitoring = monitoringService.getJobMonitoring(jobId);
    const decisions = monitoring.aiDecisions || job.metadata?.aiDecisions || [];

    res.json({ decisions });
  } catch (error) {
    console.error('Error fetching AI decisions:', error);
    res.status(500).json({ error: 'Failed to fetch AI decisions' });
  }
});

module.exports = router;
