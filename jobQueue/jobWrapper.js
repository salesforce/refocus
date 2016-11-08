/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /jobQueue/jobWrapper.js
 *
 * Expsoses a wrapper to create jobs and save them to the redis queue for
 * it to be processed by the workers later. The "kue" library defined in the
 * setup is used for this purpose.
 */

'use strict'; // eslint-disable-line strict

const jobQueue = require('./setup').jobQueue;

const delayToRemoveJobs = 3000;

/**
 * Listen for a job completion event and clean up (remove) the job. The delay
 * is introduced to avoid the job.id leakage.
 * TODO: This needs to be moved to the clock process, once we start exposing
 * APIs to monitor the jobs.
 * @param  {Object} job - Job object to be cleaned up from the queue
 *
 */
function cleanUpJobOnComplete(job) {
  if (job) {
    job.on('complete', () => {
      setTimeout(() => {
        job.remove();
      }, delayToRemoveJobs);
    });
  }
}

/**
 * Creates a job to be prossed using the KUE api, when given the jobName and
 * data to be processed by the job
 * @param  {String} jobName - Name of the job (A worker process should be
 * listning to this jobName for it to be processed)
 * @param  {Json} data - Data for the job to work with.
 * @returns {Object} - A job object
 */
function createJob(jobName, data) {
  // jobQueue.create will return undefined when it is created in the test mode
  const job = jobQueue.create(jobName, data)
      .save((err) => {
        if (err) {
          throw new Error('There was a problem in adding the job: ' + jobName +
                              ', with id:' + job.id + 'to the worker queue');
        }
      });
  cleanUpJobOnComplete(job);
  return job;
}
module.exports = {
  jobQueue,
  createJob
};
