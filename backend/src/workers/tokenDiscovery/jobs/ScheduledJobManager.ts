/**
 * Scheduled Job Manager
 *
 * Manages all scheduled background jobs with activity-aware execution
 * Wraps jobs with activity checking to eliminate waste when system is idle
 */

import Redis from 'ioredis';
import { loggers } from '../../../utils/logger.js';
import { shouldRunBackgroundJobs } from '../utils/activityCheck.js';
import { IScheduledJob } from '../types.js';

const logger = loggers.server;

export class ScheduledJobManager {
  private intervals: NodeJS.Timeout[] = [];
  private jobs: IScheduledJob[] = [];
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Register a single job
   */
  registerJob(job: IScheduledJob): void {
    this.jobs.push(job);

    const interval = setInterval(async () => {
      // Check if system should run jobs (activity-aware)
      if (await shouldRunBackgroundJobs(this.redis)) {
        try {
          await job.run();
        } catch (error) {
          logger.error({
            job: job.getName(),
            error
          }, 'Job execution failed');
        }
      } else {
        logger.debug({
          job: job.getName(),
          reason: 'no_active_users'
        }, 'Skipping job - system idle');
      }
    }, job.getInterval());

    this.intervals.push(interval);

    logger.info({
      job: job.getName(),
      interval: job.getInterval()
    }, 'Job registered');
  }

  /**
   * Register multiple jobs at once
   */
  registerMany(jobs: IScheduledJob[]): void {
    jobs.forEach(job => this.registerJob(job));
  }

  /**
   * Stop all jobs
   */
  stopAll(): void {
    this.intervals.forEach(i => clearInterval(i));
    this.intervals = [];

    logger.info({
      jobCount: this.jobs.length
    }, 'All jobs stopped');
  }

  /**
   * Get list of registered jobs
   */
  getJobs(): IScheduledJob[] {
    return [...this.jobs];
  }

  /**
   * Get number of registered jobs
   */
  getJobCount(): number {
    return this.jobs.length;
  }
}
