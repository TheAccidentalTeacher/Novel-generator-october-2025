const express = require('express');
const router = express.Router();
const Job = require('../models/job');

// Emergency database cleanup endpoint
router.post('/emergency-cleanup', async (req, res) => {
  try {
    console.log('🚨 EMERGENCY CLEANUP STARTED');
    
    // Get all jobs to show current state
    const allJobs = await Job.find({}).sort({ createdAt: -1 });
    console.log(`Total jobs in database: ${allJobs.length}`);
    
    // Count by status
    const statusCounts = {};
    allJobs.forEach(job => {
      statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
    });
    
    console.log('Current job status:', statusCounts);
    
    // Find all non-completed jobs (regardless of age)
    const nonCompletedJobs = await Job.find({
      status: { $in: ['processing', 'planning', 'outlining', 'writing', 'pending'] }
    });
    
    console.log(`Found ${nonCompletedJobs.length} non-completed jobs to clean`);
    
    let cleanedCount = 0;
    for (const job of nonCompletedJobs) {
      console.log(`Cleaning job ${job._id} (status: ${job.status})`);
      job.status = 'failed';
      job.currentPhase = 'emergency_cleanup';
      job.error = 'Emergency cleanup - freed up job slot';
      job.progress.lastActivity = new Date();
      await job.save();
      cleanedCount++;
    }
    
    // Get final counts
    const finalJobs = await Job.find({});
    const finalStatusCounts = {};
    finalJobs.forEach(job => {
      finalStatusCounts[job.status] = (finalStatusCounts[job.status] || 0) + 1;
    });
    
    console.log('Final job status:', finalStatusCounts);
    console.log('🎯 Emergency cleanup complete!');
    
    res.json({
      success: true,
      message: `Emergency cleanup complete! Freed up ${cleanedCount} job slots`,
      before: statusCounts,
      after: finalStatusCounts,
      cleanedJobs: cleanedCount
    });
    
  } catch (error) {
    console.error('❌ Emergency cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Emergency cleanup failed',
      details: error.message
    });
  }
});

// Nuclear option - delete ALL jobs
router.post('/nuclear-cleanup', async (req, res) => {
  try {
    console.log('☢️  NUCLEAR CLEANUP - DELETING ALL JOBS');
    
    const deleteResult = await Job.deleteMany({});
    console.log(`Deleted ${deleteResult.deletedCount} jobs`);
    
    res.json({
      success: true,
      message: `Nuclear cleanup complete! Deleted ${deleteResult.deletedCount} jobs`,
      deletedCount: deleteResult.deletedCount
    });
    
  } catch (error) {
    console.error('❌ Nuclear cleanup error:', error);
    res.status(500).json({
      success: false,
      error: 'Nuclear cleanup failed',
      details: error.message
    });
  }
});

module.exports = router;
