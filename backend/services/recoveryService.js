const Job = require('../models/job');
const logger = require('../logger');
const aiService = require('./aiService');

class RecoveryService {
  constructor() {
    this.checkInterval = 5 * 60 * 1000; // 5 minutes
    this.timeoutThreshold = 30 * 60 * 1000; // 30 minutes
    this.intervalId = null;
  }

  startPeriodicCheck() {
    if (this.intervalId) {
      logger.warn('Recovery service already running');
      return;
    }

    logger.info('Starting recovery service periodic check');
    this.intervalId = setInterval(() => {
      this.checkForStalledJobs().catch(error => {
        logger.error('Error in recovery service check:', error);
      });
    }, this.checkInterval);

    // Run initial check
    this.checkForStalledJobs().catch(error => {
      logger.error('Error in initial recovery check:', error);
    });
  }

  stopPeriodicCheck() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      logger.info('Stopped recovery service periodic check');
    }
  }

  async checkForStalledJobs() {
    try {
      const cutoffTime = new Date(Date.now() - this.timeoutThreshold);
      
      // Find jobs that might be stalled
      const stalledJobs = await Job.find({
        status: { $in: ['planning', 'outlining', 'writing'] },
        'progress.lastActivity': { $lt: cutoffTime }
      }).limit(10);

      if (stalledJobs.length === 0) {
        logger.debug('No stalled jobs found');
        return;
      }

      logger.info(`Found ${stalledJobs.length} potentially stalled jobs`);

      for (const job of stalledJobs) {
        await this.recoverJob(job._id.toString());
      }

    } catch (error) {
      logger.error('Error checking for stalled jobs:', error);
    }
  }

  async recoverJob(jobId) {
    try {
      const job = await Job.findById(jobId);
      if (!job) {
        logger.warn(`Job ${jobId} not found during recovery`);
        return;
      }

      // Check if job is actually stalled or if it's actively being processed
      const activeJobs = aiService.getActiveJobs();
      const isActive = activeJobs.some(activeJob => activeJob.jobId === jobId);
      
      if (isActive) {
        logger.debug(`Job ${jobId} is actively being processed, skipping recovery`);
        return;
      }

      logger.info(`Attempting to recover stalled job ${jobId} (status: ${job.status}, phase: ${job.currentPhase})`);

      // Update job status to recovering
      job.status = 'recovering';
      job.progress.lastActivity = new Date();
      await job.save();

      // Determine recovery strategy based on current phase
      let recoverySuccess = false;

      switch (job.currentPhase) {
        case 'premise_analysis':
        case 'outline_generation':
          if (!job.outline || job.outline.length === 0) {
            logger.info(`Job ${jobId}: Restarting outline generation`);
            await aiService.generateOutline(jobId);
            await aiService.generateChapters(jobId);
            await aiService.finalizeJob(jobId);
            recoverySuccess = true;
          } else {
            logger.info(`Job ${jobId}: Outline exists, proceeding to chapter generation`);
            await aiService.generateChapters(jobId);
            await aiService.finalizeJob(jobId);
            recoverySuccess = true;
          }
          break;

        case 'chapter_writing':
          const completedChapters = job.chapters.length;
          const totalChapters = job.targetChapters;
          
          if (completedChapters < totalChapters) {
            logger.info(`Job ${jobId}: Resuming chapter generation from chapter ${completedChapters + 1}`);
            await aiService.resumeChapterGeneration(jobId, completedChapters + 1);
            await aiService.finalizeJob(jobId);
            recoverySuccess = true;
          } else {
            logger.info(`Job ${jobId}: All chapters complete, finalizing`);
            await aiService.finalizeJob(jobId);
            recoverySuccess = true;
          }
          break;

        case 'quality_validation':
        case 'finalization':
          logger.info(`Job ${jobId}: Finalizing job`);
          await aiService.finalizeJob(jobId);
          recoverySuccess = true;
          break;

        default:
          logger.warn(`Job ${jobId}: Unknown phase ${job.currentPhase}, marking as failed`);
          break;
      }

      if (recoverySuccess) {
        logger.info(`Successfully recovered job ${jobId}`);
      } else {
        // Mark job as failed if recovery wasn't possible
        await this.markJobAsFailed(jobId, 'Recovery failed - unknown state');
      }

    } catch (error) {
      logger.error(`Error recovering job ${jobId}:`, error);
      await this.markJobAsFailed(jobId, `Recovery error: ${error.message}`);
    }
  }

  async markJobAsFailed(jobId, reason) {
    try {
      const job = await Job.findById(jobId);
      if (job) {
        job.status = 'failed';
        job.progress.lastActivity = new Date();
        await job.save();
        logger.info(`Marked job ${jobId} as failed: ${reason}`);
      }
    } catch (error) {
      logger.error(`Error marking job ${jobId} as failed:`, error);
    }
  }

  async getRecoveryStats() {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      const stats = await Job.aggregate([
        {
          $match: {
            createdAt: { $gte: oneWeekAgo }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            recent: {
              $sum: {
                $cond: [
                  { $gte: ['$createdAt', oneDayAgo] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]);

      return {
        timeframe: '7 days',
        stats: stats.reduce((acc, stat) => {
          acc[stat._id] = {
            total: stat.count,
            last24h: stat.recent
          };
          return acc;
        }, {}),
        generatedAt: now
      };

    } catch (error) {
      logger.error('Error generating recovery stats:', error);
      return null;
    }
  }

  async cleanupOldJobs(daysOld = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const result = await Job.deleteMany({
        status: { $in: ['completed', 'failed'] },
        createdAt: { $lt: cutoffDate }
      });

      logger.info(`Cleaned up ${result.deletedCount} jobs older than ${daysOld} days`);
      return result.deletedCount;

    } catch (error) {
      logger.error('Error cleaning up old jobs:', error);
      return 0;
    }
  }

  async forceRecoverJob(jobId) {
    try {
      logger.info(`Force recovering job ${jobId}`);
      
      const job = await Job.findById(jobId);
      if (!job) {
        throw new Error(`Job ${jobId} not found`);
      }

      if (job.status === 'completed') {
        logger.info(`Job ${jobId} is already completed`);
        return { success: true, message: 'Job already completed' };
      }

      // Reset job to a recoverable state
      job.status = 'recovering';
      job.progress.lastActivity = new Date();
      await job.save();

      // Start recovery process
      await this.recoverJob(jobId);

      return { success: true, message: 'Job recovery initiated' };

    } catch (error) {
      logger.error(`Error in force recovery for job ${jobId}:`, error);
      return { success: false, message: error.message };
    }
  }
}

module.exports = new RecoveryService();
