const mongoose = require('mongoose');
require('dotenv').config();

// Import the Job model
const Job = require('./models/job');

async function cleanupDatabase() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all jobs that might be stuck
    console.log('\n📊 Checking current job status...');
    const allJobs = await Job.find({}).sort({ createdAt: -1 });
    
    console.log(`Total jobs in database: ${allJobs.length}`);
    
    // Count jobs by status
    const statusCounts = {};
    allJobs.forEach(job => {
      statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
    });
    
    console.log('Job status breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    // Find potentially stuck jobs (not completed/failed and older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const stuckJobs = await Job.find({
      status: { $in: ['processing', 'planning', 'outlining', 'writing', 'pending'] },
      $or: [
        { 'progress.lastActivity': { $lt: oneHourAgo } },
        { 'progress.lastActivity': { $exists: false } },
        { createdAt: { $lt: oneHourAgo } }
      ]
    });

    console.log(`\n🔍 Found ${stuckJobs.length} potentially stuck jobs`);

    if (stuckJobs.length > 0) {
      console.log('\n🧹 Cleaning up stuck jobs...');
      
      for (const job of stuckJobs) {
        console.log(`  Cleaning job ${job._id} (status: ${job.status}, created: ${job.createdAt})`);
        job.status = 'failed';
        job.currentPhase = 'cleaned_up_manual';
        job.error = 'Job manually cleaned up - was stuck';
        job.progress.lastActivity = new Date();
        await job.save();
      }
      
      console.log(`✅ Cleaned up ${stuckJobs.length} stuck jobs`);
    }

    // Option to clean ALL jobs (uncomment if you want to start completely fresh)
    console.log('\n❓ Do you want to delete ALL jobs? Uncomment the lines below if yes...');
    /*
    console.log('🗑️  DELETING ALL JOBS...');
    const deleteResult = await Job.deleteMany({});
    console.log(`✅ Deleted ${deleteResult.deletedCount} jobs`);
    */

    // Show final status
    console.log('\n📊 Final job status...');
    const finalJobs = await Job.find({}).sort({ createdAt: -1 });
    const finalStatusCounts = {};
    finalJobs.forEach(job => {
      finalStatusCounts[job.status] = (finalStatusCounts[job.status] || 0) + 1;
    });
    
    console.log('Final job status breakdown:');
    Object.entries(finalStatusCounts).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    console.log('\n✅ Database cleanup complete!');
    console.log('🎯 You should now be able to generate new novels.');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run the cleanup
cleanupDatabase();
