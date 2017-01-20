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
const jobQueue = require('./setup').jobQueue;
const jwtUtil = require('../utils/jwtUtil');
const featureToggles = require('feature-toggles');
const activityLogUtil = require('../utils/activityLog');
const TIME_TO_LIVE = // one hour
  1000 * 60 * 60; // eslint-disable-line no-magic-numbers

/*
 * The delay is introduced to avoid the job.id leakage. It can be any
 * arbitary number large enough that it does not cause the leakage.
 *
 * TODO: Clean this up once we move job removal listener to the clock process.
 */
const delayToRemoveJobs = 3000;

/**
 * Set log object params from job results.
 * @param  {Object} jobResultObj - Job result object
 * @param  {Object} logObject - Log object
 */
function mapJobResultsToLogObject(jobResultObj, logObject) {
  if (jobResultObj.reqStartTime) {
    logObject.totalTime = `${Date.now() - jobResultObj.reqStartTime}ms`;
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
 * Listen for a job completion event and clean up (remove) the job. The delay
 * is introduced to avoid the job.id leakage. If activity logs are enabled,
 * update logObject and print log
 *
 * TODO: This needs to be moved to the clock process, once we start exposing
 * APIs to monitor the jobs.
 *
 * @param {Object} job - Job object to be cleaned up from the queue
 */
function processJobOnComplete(job, logObject) {
  if (job) {
    job.on('complete', (jobResultObj) => {
      setTimeout(() => {
        try {
          console.log('Ready to ' + // eslint-disable-line no-console
            `remove job ${job.id}`);
          job.remove((err) => {
            if (err) {
              console.log('Error removing ' + // eslint-disable-line no-console
                `${job.id}`, err);
            } else {
              console.log('Removed ' + // eslint-disable-line no-console
                `completed job ${job.id}`);
            }
          });
        } catch (err) {
          console.log('Error removing ' + // eslint-disable-line no-console
            'kue job', job, err);
        }
      }, delayToRemoveJobs);

      // if enableWorkerActivityLogs is enabled, update logObject
      if (featureToggles.isFeatureEnabled('enableWorkerActivityLogs') &&
       jobResultObj && logObject) {
        mapJobResultsToLogObject(jobResultObj, logObject);

        /* The second argument should match the activity type in
         /config/activityLog.js */
        activityLogUtil.printActivityLogString(logObject, 'worker');
      }
    });
  }
} // processJobOnComplete

/**
 * Logs worker activity and remove job when complete.
 *
 * @param  {Object} req - Request object
 * @param  {Object} job - Worker job
 */
function logAndRemoveJobOnComplete(req, job) {
  // if activity logs are enabled, log activity and remove job
  if (featureToggles.isFeatureEnabled('enableWorkerActivityLogs')) {
    // create worker activity log object
    const logObject = {};
    if (job.type) {
      logObject.jobType = job.type;
    }

    logObject.ipAddress = activityLogUtil.getIPAddrFromReq(req);

    /* if req object, then extract user, token and ipaddress and update log
      object */
    if (req) {
      jwtUtil.getTokenDetailsFromToken(req)
      .then((resObj) => {
        logObject.user = resObj.username;
        logObject.token = resObj.tokenname;
      });
    }

    // continue to update and print logObject on job completion.
    processJobOnComplete(job, logObject);
  } else {
    // no activity logs, remove job
    processJobOnComplete(job);
  }
}

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
  const job = jobQueue.create(jobName, data)
  .ttl(TIME_TO_LIVE)
  .save((err) => {
    if (err) {
      const msg =
        `Error adding ${jobName} job (id ${job.id}) to the worker queue`;
      throw new Error(msg);
    }

    console.log(`Job ${job.id} ` + // eslint-disable-line no-console
      `(${jobName}) created`);
  });

  logAndRemoveJobOnComplete(req, job);
  return job;
} // createJob

module.exports = {
  jobQueue,
  createJob,
  mapJobResultsToLogObject,
  logAndRemoveJobOnComplete,
}; // exports
