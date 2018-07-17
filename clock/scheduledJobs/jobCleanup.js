/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * clock/scheduledJobs/jobCleanup.js
 *
 * Executes the process to clean up jobs
 */
const featureToggles = require('feature-toggles');
const Promise = require('bluebird');
const kue = require('kue');
const jobType = require('../../jobQueue/setup').jobType;
const jobWrapper = require('../../jobQueue/jobWrapper');
const conf = require('../../config');
kue.Job.rangeByStateAsync = Promise.promisify(kue.Job.rangeByState);
kue.Job.prototype.removeAsync = Promise.promisify(kue.Job.prototype.remove);
const activityLogUtil = require('../../utils/activityLog');

function logActivity(skippedJobCount, removedJobCount, errorJobCount,
                     jobStartTime) {
  const iterations = skippedJobCount + removedJobCount - errorJobCount;
  if (iterations) {
    const jobEndTime = Date.now();
    const jobCleanUpWrapper = {};
    jobCleanUpWrapper.iterations = iterations;
    jobCleanUpWrapper.errors = errorJobCount;
    jobCleanUpWrapper.removed = removedJobCount;
    jobCleanUpWrapper.skipped = skippedJobCount;
    jobCleanUpWrapper.totalTime = `${jobEndTime - jobStartTime}ms`;
    activityLogUtil.printActivityLogString(jobCleanUpWrapper, 'jobCleanup');
  }
}

/**
 * Execute the call to clean up completed jobs.
 * Get batchSize completed jobs, delete those jobs, and repeat until there are
 * no jobs left, skipping any that are younger than delay ms.
 *
 * @param {Number} batchSize - the number of jobs to delete in each batch
 * @param {Number} delay - the delay, in ms, before completed jobs should be
 *  deleted
 * @returns {Promise}
 */
function execute(batchSize, delay) {
  let now;
  let removedJobCount = 0;
  let skippedJobCount = 0;
  let errorJobCount = 0;
  const jobStartTime = Date.now();

  return deleteNextNJobs(batchSize)
    .then(() => {
      if (featureToggles.isFeatureEnabled('enableJobCleanupActivityLogs')) {
        logActivity(skippedJobCount, removedJobCount,
          errorJobCount, jobStartTime);
      }
    });

  function deleteNextNJobs(n) {
    if (n === 0) return Promise.resolve();
    const from = skippedJobCount;
    const to = skippedJobCount + n - 1;
    if (!now) now = Date.now();

    // get n jobs
    return kue.Job.rangeByStateAsync('complete', from, to, 'asc')
      .catch((err) => {
        console.log('Error getting completed jobs from queue', err);
        return Promise.reject(err);
      })

      // delete n jobs
      .then((jobs) =>
        Promise.all(jobs.map((job) => {
          if (delay > 0 && now - job.updated_at < delay) {
            return 'skipped';
          }

          return job.removeAsync()
            .catch((err) => {
              errorJobCount++;
              return Promise.reject(err);
            });
        }))
      )

      // count skipped jobs
      .then((results) => {
        const skippedCount = results.reduce((count, result) =>
            result === 'skipped' ? count + 1 : count,
          0);
        skippedJobCount += skippedCount;
        removedJobCount += results.length - skippedCount;
        return Promise.resolve(results);
      })

      // get and delete next n jobs
      .then((results) => {
        if (results.length < n) return Promise.resolve();

        return deleteNextNJobs(n);
      });
  }
} // execute

/**
 * Send the job to the worker or execute directly
 */
function enqueue() {
  if (featureToggles.isFeatureEnabled('enableWorkerProcess')) {
    const job = jobWrapper.createJob(
      jobType.JOB_CLEANUP, { reqStartTime: Date.now() }
    );
    return Promise.resolve(job);
  }

  // If not using worker process, execute directly;
  return execute(conf.JOB_REMOVAL_BATCH_SIZE, conf.JOB_REMOVAL_DELAY);
} // enqueue

/**
 * Reset the job counter so job ids will be assigned starting from zero again
 */
function resetCounter() {
  const client = kue.Job.client;
  const key = client.getKey('ids');
  client.del(key);
} // resetCounter

module.exports = {
  enqueue,
  resetCounter,
  execute,
};
