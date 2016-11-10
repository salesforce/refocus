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
 *This jobWrapper module uses the "kue" library to help create jobs and
 * enqueue them. Jobs are subsequently dequeued and executed by a
 * separate worker process.
 */

'use strict'; // eslint-disable-line strict
const jobQueue = require('./setup').jobQueue;

/* The delay is introduced to avoid the job.id leakage. It can be any
 * arbitary big enough number that does not case the leakage.
 * TODO: Clean this up once we move job removal listner to the clock process.
 */
const delayToRemoveJobs = 3000;

/**
 * Listen for a job completion event and clean up (remove) the job. The delay
 * is introduced to avoid the job.id leakage.
 * TODO: This needs to be moved to the clock process, once we start exposing
 * APIs to monitor the jobs.
 * @param {Object} job - Job object to be cleaned up from the queue
 *
 */
function removeJobOnComplete(job) {
  if (job) {
    job.on('complete', () => {
      setTimeout(() => {
        job.remove();
      }, delayToRemoveJobs);
    });
  }
} // removeJobOnComplete

/**
 * Creates a job to be prossed using the KUE api, when given the jobName and
 * data to be processed by the job.
 * @param {String} jobName - The job name. A worker process will be
 *   listening for this jobName to process the jobs.
 * @param {Object} data - Data for the job to work with.
 * @returns {Object} - A job object. The job object will be null when the
 *  jobQueue is created in the test mode.
 */
function createJob(jobName, data) {
  const job = jobQueue.create(jobName, data)
      .save((err) => {
        if (err) {
          throw new Error('There was a problem in adding the job: ' + jobName +
                              ', with id:' + job.id + 'to the worker queue');
        }
      });
  removeJobOnComplete(job);
  return job;
} // createJob
module.exports = {

  jobQueue,
  createJob

}; // exports
