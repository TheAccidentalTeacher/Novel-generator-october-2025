// recoveryService.js - Production-ready job recovery and monitoring service
const Job = require('../models/job');
const logger = require('../logger');

class RecoveryService {
  constructor() {
    // Configuration with environment variable support
    this.config = {
      checkInterval: parseInt(process.env.RECOVERY_CHECK_INTERVAL) || (5 * 60 * 1000), // 5 minutes
      timeoutThreshold: parseInt(process.env.JOB_TIMEOUT_THRESHOLD) || (30 * 60 * 1000), // 30 minutes
      maxConcurrentRecoveries: parseInt(process.env.MAX_CONCURRENT_RECOVERIES) || 3,
      retryAttempts: parseInt(process.env.RECOVERY_RETRY_ATTEMPTS) || 3,
      cleanupInterval: parseInt(process.env.CLEANUP_INTERVAL) || (24 * 60 * 60 * 1000), // 24 hours
      oldJobDays: parseInt(process.env.OLD_JOB_CLEANUP_DAYS) || 30
    };
    
    // Service state
    this.intervalId = null;
    this.cleanupIntervalId = null;
    this.isRunning = false;
    this.isShuttingDown = false;
    this.activeRecoveries = new Set();
    this.stats = {
      totalChecks: 0,
      jobsRecovered: 0,
      recoveryFailures: 0,
      lastCheck: null,
      startTime: null
    };
    
    // Bind methods to preserve context
    this.checkForStalledJobs = this.checkForStalledJobs.bind(this);
    this.performCleanup = this.performCleanup.bind(this);
    
    logger.info('Recovery service initialized with configuration:', this.config);
  }

  /**
   * Start the recovery service with comprehensive error handling
   */
  async startPeriodicCheck() {
    if (this.isRunning) {
      logger.warn('Recovery service is already running');
      return { success: true, message: 'Already running' };
    }

    try {
      logger.info('Starting recovery service...');
      
      // Validate dependencies
      await this.validateDependencies();
      
      this.isRunning = true;
      this.isShuttingDown = false;
      this.stats.startTime = new Date();
      
      // Start periodic job recovery checks
      this.intervalId = setInterval(async () => {
        if (!this.isShuttingDown) {
          try {
            await this.checkForStalledJobs();
          } catch (error) {
            logger.error('Error in recovery service check:', error);
            this.stats.recoveryFailures++;
          }
        }
      }, this.config.checkInterval);
      
      // Start periodic cleanup
      this.cleanupIntervalId = setInterval(async () => {
        if (!this.isShuttingDown) {
          try {
            await this.performCleanup();
          } catch (error) {
            logger.error('Error in cleanup service:', error);
          }
        }
      }, this.config.cleanupInterval);
      
      // Run initial check
      setImmediate(async () => {
        try {
          await this.checkForStalledJobs();
          logger.info('Recovery service started successfully');
        } catch (error) {
          logger.error('Error in initial recovery check:', error);
        }
      });
      
      return { success: true, message: 'Recovery service started' };
      
    } catch (error) {
      logger.error('Failed to start recovery service:', error);
      this.isRunning = false;
      return { success: false, message: error.message };
    }
  }

  /**
   * Validate that required dependencies are available
   */
  async validateDependencies() {
    try {
      // Test database connection
      await Job.findOne().limit(1);
      logger.debug('Database connectivity validated');
      
      // Validate aiService is available (will be lazy loaded)
      logger.debug('Dependencies validated successfully');
      
    } catch (error) {
      logger.error('Dependency validation failed:', error);
      throw new Error(`Recovery service dependency check failed: ${error.message}`);
    }
  }

  /**
   * Stop the recovery service gracefully
   */
  async stop() {
    if (!this.isRunning) {
      logger.debug('Recovery service is not running');
      return { success: true, message: 'Not running' };
    }

    try {
      logger.info('Stopping recovery service...');
      this.isShuttingDown = true;
      
      // Clear intervals
      if (this.intervalId) {
        clearInterval(this.intervalId);
        this.intervalId = null;
      }
      
      if (this.cleanupIntervalId) {
        clearInterval(this.cleanupIntervalId);
        this.cleanupIntervalId = null;
      }
      
      // Wait for active recoveries to complete (with timeout)
      const maxWaitTime = 30000; // 30 seconds
      const waitInterval = 1000; // 1 second
      let waitTime = 0;
      
      while (this.activeRecoveries.size > 0 && waitTime < maxWaitTime) {
        logger.info(`Waiting for ${this.activeRecoveries.size} active recoveries to complete...`);
        await new Promise(resolve => setTimeout(resolve, waitInterval));
        waitTime += waitInterval;
      }
      
      if (this.activeRecoveries.size > 0) {
        logger.warn(`Forced shutdown with ${this.activeRecoveries.size} active recoveries`);
      }
      
      this.isRunning = false;
      this.isShuttingDown = false;
      
      logger.info('Recovery service stopped successfully');
      return { success: true, message: 'Recovery service stopped' };
      
    } catch (error) {
      logger.error('Error stopping recovery service:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Check for stalled jobs and attempt recovery
   */
  async checkForStalledJobs() {
    if (this.isShuttingDown) {
      return;
    }

    try {
      this.stats.totalChecks++;
      this.stats.lastCheck = new Date();
      
      const cutoffTime = new Date(Date.now() - this.config.timeoutThreshold);
      
      // Find potentially stalled jobs
      const stalledJobs = await Job.find({
        status: { $in: ['planning', 'analyzing', 'outlining', 'writing', 'recovering'] },
        $or: [
          { 'progress.lastActivity': { $lt: cutoffTime } },
          { 'progress.lastActivity': { $exists: false } }
        ]
      })
      .select('_id status currentPhase progress.lastActivity')
      .sort({ 'progress.lastActivity': 1 })
      .limit(this.config.maxConcurrentRecoveries * 2); // Get more than we can handle to prioritize

      if (stalledJobs.length === 0) {
        logger.debug('No stalled jobs found during recovery check');
        return { stalledJobsFound: 0, recoveriesStarted: 0 };
      }

      logger.info(`Found ${stalledJobs.length} potentially stalled jobs`);
      
      // Filter jobs that aren't already being recovered
      const jobsToRecover = stalledJobs.filter(job => 
        !this.activeRecoveries.has(job._id.toString())
      ).slice(0, this.config.maxConcurrentRecoveries - this.activeRecoveries.size);

      let recoveriesStarted = 0;
      
      // Start recovery for eligible jobs
      for (const job of jobsToRecover) {
        if (this.activeRecoveries.size >= this.config.maxConcurrentRecoveries) {
          logger.debug('Maximum concurrent recoveries reached, queuing remaining jobs');
          break;
        }
        
        if (!this.isShuttingDown) {
          this.startJobRecovery(job._id.toString());
          recoveriesStarted++;
        }
      }

      return { 
        stalledJobsFound: stalledJobs.length, 
        recoveriesStarted,
        activeRecoveries: this.activeRecoveries.size
      };

    } catch (error) {
      logger.error('Error checking for stalled jobs:', error);
      this.stats.recoveryFailures++;
      throw error;
    }
  }

  /**
   * Start recovery for a specific job (non-blocking)
   */
  startJobRecovery(jobId) {
    if (this.activeRecoveries.has(jobId)) {
      logger.debug(`Job ${jobId} is already being recovered`);
      return;
    }

    this.activeRecoveries.add(jobId);
    
    // Run recovery asynchronously
    setImmediate(async () => {
      try {
        await this.recoverJob(jobId);
        this.stats.jobsRecovered++;
      } catch (error) {
        logger.error(`Recovery failed for job ${jobId}:`, error);
        this.stats.recoveryFailures++;
      } finally {
        this.activeRecoveries.delete(jobId);
      }
    });
  }

  /**
   * Recover a specific job with retry logic
   */
  async recoverJob(jobId, attemptNumber = 1) {
    try {
      logger.info(`Attempting to recover job ${jobId} (attempt ${attemptNumber}/${this.config.retryAttempts})`);
      
      const job = await Job.findById(jobId);
      if (!job) {
        logger.warn(`Job ${jobId} not found during recovery`);
        return { success: false, reason: 'Job not found' };
      }

      // Check if job is in a final state
      if (['completed', 'failed', 'cancelled'].includes(job.status)) {
        logger.debug(`Job ${jobId} is in final state: ${job.status}`);
        return { success: true, reason: 'Job already in final state' };
      }

      // Lazy load aiService to avoid circular dependencies
      const aiService = require('./aiService');
      
      // Check if job is actually active in aiService
      if (aiService.isJobActive && aiService.isJobActive(jobId)) {
        logger.debug(`Job ${jobId} is actively being processed, updating last activity`);
        await Job.findByIdAndUpdate(jobId, {
          'progress.lastActivity': new Date()
        });
        return { success: true, reason: 'Job is actively processing' };
      }

      // Update job status to recovering
      await Job.findByIdAndUpdate(jobId, {
        status: 'recovering',
        'progress.lastActivity': new Date(),
        $push: {
          'progress.recoveryAttempts': {
            timestamp: new Date(),
            attempt: attemptNumber,
            phase: job.currentPhase
          }
        }
      });

      // Determine recovery strategy based on current phase and job state
      const recoveryResult = await this.executeRecoveryStrategy(job, aiService);
      
      if (recoveryResult.success) {
        logger.info(`Successfully recovered job ${jobId}: ${recoveryResult.action}`);
        return recoveryResult;
      } else {
        throw new Error(recoveryResult.reason);
      }

    } catch (error) {
      logger.error(`Recovery attempt ${attemptNumber} failed for job ${jobId}:`, error);
      
      // Retry if we haven't exceeded max attempts
      if (attemptNumber < this.config.retryAttempts && !this.isShuttingDown) {
        logger.info(`Retrying recovery for job ${jobId} in 30 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 30000));
        return await this.recoverJob(jobId, attemptNumber + 1);
      } else {
        // Mark job as failed after all retry attempts
        await this.markJobAsFailed(jobId, `Recovery failed after ${attemptNumber} attempts: ${error.message}`);
        return { success: false, reason: `Recovery failed after ${attemptNumber} attempts` };
      }
    }
  }

  /**
   * Execute the appropriate recovery strategy based on job state
   */
  async executeRecoveryStrategy(job, aiService) {
    try {
      const jobId = job._id.toString();
      
      switch (job.currentPhase) {
        case 'pending':
        case 'premise_analysis':
          logger.info(`Job ${jobId}: Restarting from premise analysis`);
          await aiService.generateNovel(jobId);
          return { success: true, action: 'Restarted novel generation' };

        case 'outline_generation':
          if (!job.outline || job.outline.length === 0) {
            logger.info(`Job ${jobId}: Restarting outline generation`);
            await aiService.generateNovel(jobId);
            return { success: true, action: 'Restarted from outline generation' };
          } else {
            logger.info(`Job ${jobId}: Outline exists, proceeding to chapter generation`);
            await aiService.resumeChapterGeneration(jobId, 1);
            return { success: true, action: 'Resumed from chapter generation' };
          }

        case 'chapter_writing':
          const completedChapters = job.chapters ? job.chapters.length : 0;
          const nextChapter = completedChapters + 1;
          
          if (nextChapter <= job.targetChapters) {
            logger.info(`Job ${jobId}: Resuming chapter generation from chapter ${nextChapter}`);
            await aiService.resumeChapterGeneration(jobId, nextChapter);
            return { success: true, action: `Resumed from chapter ${nextChapter}` };
          } else {
            logger.info(`Job ${jobId}: All chapters complete, finalizing`);
            await aiService.finalizeJob(jobId);
            return { success: true, action: 'Finalized completed chapters' };
          }

        case 'quality_validation':
        case 'finalization':
          logger.info(`Job ${jobId}: Finalizing job from ${job.currentPhase}`);
          await aiService.finalizeJob(jobId);
          return { success: true, action: 'Finalized job' };

        default:
          logger.warn(`Job ${jobId}: Unknown phase ${job.currentPhase}`);
          return { success: false, reason: `Unknown phase: ${job.currentPhase}` };
      }

    } catch (error) {
      logger.error(`Error executing recovery strategy for job ${job._id}:`, error);
      return { success: false, reason: error.message };
    }
  }

  /**
   * Mark a job as failed with detailed error information
   */
  async markJobAsFailed(jobId, reason) {
    try {
      await Job.findByIdAndUpdate(jobId, {
        status: 'failed',
        error: reason,
        'progress.lastActivity': new Date(),
        'progress.failedAt': new Date()
      });
      
      logger.info(`Marked job ${jobId} as failed: ${reason}`);
      return { success: true };
      
    } catch (error) {
      logger.error(`Error marking job ${jobId} as failed:`, error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Perform periodic cleanup of old jobs and data
   */
  async performCleanup() {
    try {
      logger.debug('Starting periodic cleanup...');
      
      const result = await this.cleanupOldJobs(this.config.oldJobDays);
      
      if (result > 0) {
        logger.info(`Cleanup completed: removed ${result} old jobs`);
      }
      
      return { jobsRemoved: result };
      
    } catch (error) {
      logger.error('Error during periodic cleanup:', error);
      throw error;
    }
  }

  /**
   * Clean up old completed and failed jobs
   */
  async cleanupOldJobs(daysOld = 30) {
    try {
      const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
      
      const result = await Job.deleteMany({
        status: { $in: ['completed', 'failed'] },
        createdAt: { $lt: cutoffDate }
      });

      return result.deletedCount;

    } catch (error) {
      logger.error('Error cleaning up old jobs:', error);
      return 0;
    }
  }

  /**
   * Force recovery of a specific job
   */
  async forceRecoverJob(jobId) {
    try {
      logger.info(`Force recovering job ${jobId}`);
      
      const job = await Job.findById(jobId);
      if (!job) {
        return { success: false, message: 'Job not found' };
      }

      if (job.status === 'completed') {
        return { success: true, message: 'Job already completed' };
      }

      // Remove from active recoveries if present
      this.activeRecoveries.delete(jobId);
      
      // Start immediate recovery
      const result = await this.recoverJob(jobId);
      
      return { 
        success: result.success, 
        message: result.success ? result.action : result.reason 
      };

    } catch (error) {
      logger.error(`Error in force recovery for job ${jobId}:`, error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get comprehensive recovery service statistics
   */
  async getRecoveryStats() {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get job statistics
      const jobStats = await Job.aggregate([
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

      // Get recovery attempt statistics
      const recoveryStats = await Job.aggregate([
        {
          $match: {
            'progress.recoveryAttempts': { $exists: true, $ne: [] }
          }
        },
        {
          $project: {
            recoveryCount: { $size: '$progress.recoveryAttempts' }
          }
        },
        {
          $group: {
            _id: null,
            totalRecoveries: { $sum: '$recoveryCount' },
            jobsWithRecovery: { $sum: 1 }
          }
        }
      ]);

      return {
        service: {
          isRunning: this.isRunning,
          startTime: this.stats.startTime,
          uptime: this.stats.startTime ? now.getTime() - this.stats.startTime.getTime() : 0,
          activeRecoveries: this.activeRecoveries.size,
          configuration: this.config
        },
        statistics: {
          totalChecks: this.stats.totalChecks,
          jobsRecovered: this.stats.jobsRecovered,
          recoveryFailures: this.stats.recoveryFailures,
          lastCheck: this.stats.lastCheck
        },
        jobs: jobStats.reduce((acc, stat) => {
          acc[stat._id] = {
            total: stat.count,
            last24h: stat.recent
          };
          return acc;
        }, {}),
        recoveries: recoveryStats[0] || { totalRecoveries: 0, jobsWithRecovery: 0 },
        generatedAt: now
      };

    } catch (error) {
      logger.error('Error generating recovery stats:', error);
      return null;
    }
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      isRunning: this.isRunning,
      isShuttingDown: this.isShuttingDown,
      activeRecoveries: this.activeRecoveries.size,
      uptime: this.stats.startTime ? Date.now() - this.stats.startTime.getTime() : 0,
      lastCheck: this.stats.lastCheck,
      totalChecks: this.stats.totalChecks,
      successRate: this.stats.totalChecks > 0 ? 
        ((this.stats.totalChecks - this.stats.recoveryFailures) / this.stats.totalChecks * 100).toFixed(2) + '%' : 
        'N/A'
    };
  }
}

// Export singleton instance
module.exports = new RecoveryService();
