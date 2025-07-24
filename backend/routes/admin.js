// Admin script to clean up stuck jobs
const express = require('express');
const router = express.Router();
const Job = require('../models/job');

// Clean up stuck jobs (admin endpoint)
router.post('/cleanup-stuck-jobs', async (req, res) => {
  try {
    console.log('Starting cleanup of stuck jobs...');
    
    // Find jobs that are stuck in active states for more than 2 hours
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    const stuckJobs = await Job.find({
      status: { $in: ['pending', 'planning', 'outlining', 'writing', 'chapter_writing'] },
      updatedAt: { $lt: twoHoursAgo }
    });
    
    console.log(`Found ${stuckJobs.length} stuck jobs`);
    
    // Mark them as failed
    const updateResult = await Job.updateMany(
      {
        status: { $in: ['pending', 'planning', 'outlining', 'writing', 'chapter_writing'] },
        updatedAt: { $lt: twoHoursAgo }
      },
      {
        $set: {
          status: 'failed',
          error: 'Job automatically cleaned up due to being stuck for more than 2 hours',
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`Updated ${updateResult.modifiedCount} stuck jobs`);
    
    // Also check for any jobs stuck for less than 2 hours
    const recentActiveJobs = await Job.find({
      status: { $in: ['pending', 'planning', 'outlining', 'writing', 'chapter_writing'] }
    }).select('_id status currentPhase createdAt updatedAt');
    
    res.json({
      success: true,
      cleanedUp: updateResult.modifiedCount,
      stuckJobIds: stuckJobs.map(job => job._id),
      remainingActiveJobs: recentActiveJobs.length,
      remainingJobs: recentActiveJobs.map(job => ({
        id: job._id,
        status: job.status,
        phase: job.currentPhase,
        age: Math.round((Date.now() - job.updatedAt.getTime()) / (1000 * 60)) + ' minutes'
      }))
    });
    
  } catch (error) {
    console.error('Error cleaning up stuck jobs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Check current job status (admin endpoint)
router.get('/job-status', async (req, res) => {
  try {
    const activeJobs = await Job.find({
      status: { $in: ['pending', 'planning', 'outlining', 'writing', 'chapter_writing'] }
    }).select('_id status currentPhase createdAt updatedAt');
    
    const completedJobs = await Job.find({
      status: 'completed'
    }).countDocuments();
    
    const failedJobs = await Job.find({
      status: 'failed'
    }).countDocuments();
    
    res.json({
      activeJobs: activeJobs.length,
      completedJobs,
      failedJobs,
      maxConcurrent: process.env.MAX_CONCURRENT_JOBS || 3,
      activeJobDetails: activeJobs.map(job => ({
        id: job._id,
        status: job.status,
        phase: job.currentPhase,
        created: job.createdAt,
        lastUpdate: job.updatedAt,
        ageMinutes: Math.round((Date.now() - job.updatedAt.getTime()) / (1000 * 60))
      }))
    });
    
  } catch (error) {
    console.error('Error checking job status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
