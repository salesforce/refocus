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
 * This jobWrapper module uses the "kue" library to help create jobs and
 * enqueue them. Jobs are subsequently dequeued and executed by a separate
 * worker process.
 */
'use strict'; // eslint-disable-line strict
const jobSetup = require('./setup');
const jobQueue = jobSetup.jobQueue;
const jwtUtil = require('../utils/jwtUtil');
const featureToggles = require('feature-toggles');
const activityLogUtil = require('../utils/activityLog');
const conf = require('../config');
const queueTimeActivityLogs =
  require('../clock/scheduledJobs/queueStatsActivityLogs');

// ttl converted to milliseconds
const TIME_TO_LIVE =
  1000 * jobSetup.ttlForJobsAsync; // eslint-disable-line no-magic-numbers

/**
 * Set log object params from job results.
 *
 * @param  {Object} jobResultObj - Job result object
 * @param  {Object} logObject - Log object
 */
function mapJobResultsToLogObject(jobResultObj, logObject) {
  const now = Date.now();
  if (jobResultObj.reqStartTime) {
    logObject.totalTime = `${now - jobResultObj.reqStartTime}ms`;
  }

  if (jobResultObj.jobEndTime) {
    logObject.queueResponseTime = `${now - jobResultObj.jobEndTime}ms`;
  }

  if (jobResultObj.queueTime) {
    logObject.queueTime = `${jobResultObj.queueTime}ms`;
  }

  if (jobResultObj.workTime) {
    logObject.workTime = `${jobResultObj.workTime}ms`;
  }

  if (jobResultObj.dbTime) {
    logObject.dbTime = `${jobResultObj.dbTime}ms`;
  }

  if (jobResultObj.recordCount) {
    logObject.recordCount = jobResultObj.recordCount;
  }

  if (jobResultObj.errorCount) {
    logObject.errorCount = jobResultObj.errorCount;
  }
}

/**
 * Listen for a job completion event. If activity logs are enabled,
 * update logObject and print log
 *
 * @param {Object} job - Job object to be cleaned up from the queue
 * @param {Object} logObject - Object containing the information that needs to
 * be logged.
 */
function processJobOnComplete(job, logObject) {
  if (job) {
    job.on('complete', (jobResultObj) => {
      // when enableWorkerActivityLogs are enabled, update the logObject
      if (featureToggles.isFeatureEnabled('enableWorkerActivityLogs') &&
       jobResultObj && logObject) {
        mapJobResultsToLogObject(jobResultObj, logObject);

        // Update queueStatsActivityLogs
        if (featureToggles
          .isFeatureEnabled('enableQueueStatsActivityLogs')) {
          queueTimeActivityLogs
            .update(jobResultObj.recordCount, jobResultObj.queueTime);
        }

        /*
         * The second argument should match the activity logging type in
         * /config/activityLog.js
         */
        activityLogUtil.printActivityLogString(logObject, 'worker');
      }
    });
  }
} // processJobOnComplete

/**
 * Logs worker activity when complete.
 *
 * @param  {Object} req - Request object
 * @param  {Object} job - Worker job
 */
function logJobOnComplete(req, job) {
  // if activity logs are enabled, log activity info
  if (featureToggles.isFeatureEnabled('enableWorkerActivityLogs')) {
    // create worker activity log object
    const logObject = {};
    if (job.type) {
      logObject.jobType = job.type;
    }

    if (job.id) {
      logObject.jobId = job.id;
    }

    /*
     * If req object is defined; extract the user name, token and ipaddress and
     * update the log object. Add "request_id" if header is set by heroku.
     */
    if (req) {
      if (req.headers && req.headers['x-request-id']) {
        logObject.request_id = req.headers['x-request-id'];
      }

      logObject.ipAddress = activityLogUtil.getIPAddrFromReq(req);

      /**
       * we already set UserName and TokenName in req headers when verifying
       * token
       */
      logObject.user = req.headers.UserName;
      logObject.token = req.headers.TokenName;
    }

    // continue to update and print logObject on job completion.
    processJobOnComplete(job, logObject);
  }
}

/**
 * Prioritize jobs based on job type, size, and ip address.
 *
 * @param {String} jobName - the type of the job
 * @param {Object} data - the job payload
 * @param {Object} req - the request object
 * @returns {String} kue priority
 */
function calculateJobPriority(jobName, data, req) {
  // low=10, normal=0, medium=-5, high=-10, critical=-15
  const ipAddress = activityLogUtil.getIPAddrFromReq(req);
  if (conf.prioritizeJobsFrom.includes(ipAddress)) {
    return 'high';
  }

  if (conf.deprioritizeJobsFrom.includes(ipAddress)) {
    return 'low';
  }

  return 'normal';
} // calculateJobPriority

/**
 * This is a promisified version of the createJob function which resolves to
 * the job created and saved by the Kue api.
 *
 * @param {String} jobName - The job name. A worker process will be
 *  listening for this jobName to process the jobs.
 * @param {Object} data - Data for the job to work with.
 * @param {Object} req - Request object.
 * @returns {Object} - A job object. The job object will be null when the
 *  jobQueue is created in the test mode.
 */
function createPromisifiedJob(jobName, data, req) {
  const jobPriority = calculateJobPriority(jobName, data, req);
  if (featureToggles.isFeatureEnabled('instrumentKue')) {
    console.log('[KJI] Entered ' + // eslint-disable-line no-console
      `jobWrapper.js createPromisifiedJob: jobName=${jobName} ` +
      `jobPriority=${jobPriority}`);
  }

  return new Promise((resolve, reject) => {
    const job = jobQueue.create(jobName, data);
    job.ttl(TIME_TO_LIVE)
    .priority(jobPriority)
    .save((err) => {
      if (err) {
        const msg =
          `Error adding ${jobName} job (id ${job.id}) to the worker queue`;
        return reject(msg);
      }

      logJobOnComplete(req, job);
      return resolve(job);
    });
  });
} // createPromisifiedJob

/**
 * Creates a job to be processed using the KUE api, given the jobName and
 * data to be processed by the job.
 *
 * @param {String} jobName - The job name. A worker process will be
 *  listening for this jobName to process the jobs.
 * @param {Object} data - Data for the job to work with.
 * @param {Object} req - Request object.
 * @returns {Object} - A job object. The job object will be null when the
 *  jobQueue is created in the test mode.
 */
function createJob(jobName, data, req) {
  const jobPriority = calculateJobPriority(jobName, data, req);
  if (featureToggles.isFeatureEnabled('instrumentKue')) {
    console.log('[KJI] Entered ' + // eslint-disable-line no-console
      `jobWrapper.js createJob: jobName=${jobName} ` +
      `jobPriority=${jobPriority}`);
  }

  const job = jobQueue.create(jobName, data);
  job.ttl(TIME_TO_LIVE)
  .priority(jobPriority)
  .save((err) => {
    if (err) {
      const msg =
        `Error adding ${jobName} job (id ${job.id}) to the worker queue`;
      throw new Error(msg);
    }

    logJobOnComplete(req, job);
  });

  return job;
} // createJob

module.exports = {
  jobQueue,
  createJob,
  createPromisifiedJob,
  mapJobResultsToLogObject,
  logJobOnComplete,
}; // exports
