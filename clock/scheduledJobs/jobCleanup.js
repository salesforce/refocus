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
const jobSetup = require('../../jobQueue/setup');
const jobQueue = jobSetup.jobQueue;
const rangeByStateAsync = Promise.promisify(kue.Job.rangeByState);
kue.Job.prototype.removeAsync = Promise.promisify(kue.Job.prototype.remove);

/**
 * Execute the call to clean up jobs
 *
 * @returns {Promise}
 */
function execute() {
  if (featureToggles.isFeatureEnabled('instrumentKue')) {
    console.log('[KJI] Ready to remove completed jobs');
  }

  return rangeByStateAsync('complete', 0, -1, 'asc') // get all completed jobs
  .then((jobs) => {
    return Promise.all(jobs.map((job) => {
      return job.removeAsync()
      .then(() => {
        if (featureToggles.isFeatureEnabled('instrumentKue')) {
          console.log(`[KJI] Removed completed job ${job.id}`);
        }
      })
      .catch((err) => {
        console.log(`Error removing job ${job.id}`, err);
        return Promise.reject(err);
      });
    }));
  })
  .catch((err) => {
    console.log('Error getting completed jobs from queue', err);
    return Promise.reject(err);
  });
} // execute

module.exports = {
  execute,
};
