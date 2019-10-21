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
const bulkDelSubQueue = jobSetup.bulkDelSubQueue;
const bulkUpsertSamplesQueue = jobSetup.bulkUpsertSamplesQueue;
const bulkPostEventsQueue = jobSetup.bulkPostEventsQueue;
const createAuditEventsQueue = jobSetup.createAuditEventsQueue;
const jwtUtil = require('../utils/jwtUtil');
const featureToggles = require('feature-toggles');
const activityLogUtil = require('../utils/activityLog');
const conf = require('../config');
const logJobCreate = require('./logJobCreate');
const jobType = require('./setup').jobType;
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
 * If activity logs are enabled, update logObject and print log
 *
 * @param {Object} job - Job object to be cleaned up from the queue
 * @param {Object} jobResultObj - Object holding Result of job
 */
function logCompletedJob(job, jobResultObj) {
  const logObject = {
    jobType: job.type,
    jobId: job.id,
  };

  Object.assign(logObject, jobResultObj.requestInfo);

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
}

bulkDelSubQueue.on('completed', (job, jobResultObj) =>
  logCompletedJob(job, jobResultObj));

bulkPostEventsQueue.on('completed', (job, jobResultObj) =>
  logCompletedJob(job, jobResultObj));

createAuditEventsQueue.on('completed', (job, jobResultObj) =>
  logCompletedJob(job, jobResultObj));

bulkUpsertSamplesQueue.on('completed', (job, jobResultObj) => {
  const logObject = {
    jobType: job.type,
    jobId: job.id,
  };

  Object.assign(logObject, jobResultObj.requestInfo);

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
 * If req object is defined; extract the user name, token and ipaddress and
 * return the object with details.
 * @param req - Request object
 */
function getRequestInfo(req) {
  const reqInfo = {};

  /*
  * If req object is defined; extract the user name, token and ipaddress and
  * update the log object. Add "request_id" if available.
  */
  if (req) {
    if (req.request_id) reqInfo.request_id = req.request_id;
    reqInfo.ipAddress = req.locals.ipAddress;

    /*
     * we already set UserName and TokenName in req headers when verifying
     * token
     */
    reqInfo.user = req.headers.UserName;
    reqInfo.token = req.headers.TokenName;
    reqInfo.process = req.process;
  }

  return reqInfo;
}

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
     * update the log object. Add "request_id" if available.
     */
    if (req) {
      if (req.request_id) logObject.request_id = req.request_id;
      logObject.ipAddress = req.locals.ipAddress;

      /*
       * we already set UserName and TokenName in req headers when verifying
       * token
       */
      logObject.user = req.headers.UserName;
      logObject.token = req.headers.TokenName;
      logObject.process = req.process;
    }

    // continue to update and print logObject on job completion.
    processJobOnComplete(job, logObject);
  }
}

/**
 * Prioritize jobs based on user name, token name or ip address.
 *
 * @param {Array} prioritize - array of user names, token names and/or ip
 *  addresses to prioritize
 * @param {Array} deprioritize - array of user names, token names and/or ip
 *  addresses to deprioritize
 * @param {Object} req - the request object
 * @returns {String|Integer} kue priority or Bull priority
 */
function calculateJobPriority(prioritize, deprioritize, req) {
  const jobPriority = {
    high: 'high',
    normal: 'normal',
    low: 'low',
  };

  if (featureToggles.isFeatureEnabled('anyBullEnabled')) {
    // ranges from 1 (highest priority) to MAX_INT  (lowest priority)
    jobPriority.high = 1;
    jobPriority.normal = 50;
    jobPriority.low = 100;
  }

  // low=10, normal=0, medium=-5, high=-10, critical=-15
  if (!req) return jobPriority.normal;
  const ip = req.locals.ipAddress;
  const un = req.headers.UserName || '';
  const tn = req.headers.TokenName || '';
  if (prioritize.includes(ip) ||
    prioritize.includes(un) ||
    prioritize.includes(tn)) return jobPriority.high;
  if (deprioritize.includes(ip) ||
    deprioritize.includes(un) ||
    deprioritize.includes(tn)) return jobPriority.low;
  return jobPriority.normal;
} // calculateJobPriority

/**
 * Function to Create a Bull job
 *
 *  listening for this jobName to process the jobs.
 * @param {Object} data - Data for the job to work with.
 * @param {Object} req - Request object.
 * @param {Object} queueType - Queue object.
 * @param {String} jobName - The job name. A worker process will be
 * @returns {Promise} - resolves to job object. The job object will be null
 *  when the jobQueue is created in test mode.
 */
function createBullJob(data, req, queueType, jobName) {
  const startTime = Date.now();
  data.requestInfo = getRequestInfo(req);

  const jobPriority = calculateJobPriority(conf.prioritizeJobsFrom,
    conf.deprioritizeJobsFrom, req);

  return queueType.add(data, { priority: jobPriority })
      .then((job) => {
        job.type = jobName;
        logJobCreate(startTime, job);
        return job;
      });
}

/**
 * This is a promisified version of the createJob function which resolves to
 * the job created and saved by the Kue api.
 *
 * @param {String} jobName - The job name. A worker process will be
 *  listening for this jobName to process the jobs.
 * @param {Object} data - Data for the job to work with.
 * @param {Object} req - Request object.
 * @returns {Promise} - resolves to job object. The job object will be null
 *  when the jobQueue is created in test mode.
 */
function createPromisifiedJob(jobName, data, req) {
  const startTime = Date.now();
  const jobPriority = calculateJobPriority(conf.prioritizeJobsFrom,
    conf.deprioritizeJobsFrom, req);
  if (featureToggles.isFeatureEnabled('enableBullForBulkDelSubj') &&
    jobName === jobType.bulkDeleteSubjects) {
    return createBullJob(data, req, bulkDelSubQueue, jobName);
  }

  if (featureToggles.isFeatureEnabled('enableBullForBulkUpsertSamples') &&
    jobName === jobType.bulkUpsertSamples) {
    return createBullJob(data, req, bulkUpsertSamplesQueue, jobName);
  }

  if (featureToggles.isFeatureEnabled('enableBullForBulkPostEvents') &&
    jobName === jobType.bulkPostEvents) {
    return createBullJob(data, req, bulkPostEventsQueue, jobName);
  }

  if (featureToggles.isFeatureEnabled('enableBullForCreateAuditEvents') &&
    jobName === jobType.createAuditEvents) {
    return createBullJob(data, req, createAuditEventsQueue, jobName);
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
        logJobCreate(startTime, job);
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
  const startTime = Date.now();
  const jobPriority = calculateJobPriority(conf.prioritizeJobsFrom,
    conf.deprioritizeJobsFrom, req);
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
    logJobCreate(startTime, job);
  });

  return job;
} // createJob

module.exports = {
  calculateJobPriority, // export for testing only
  createJob,
  createPromisifiedJob,
  jobQueue,
  logJobOnComplete,
  mapJobResultsToLogObject,
  bulkDelSubQueue,
  bulkUpsertSamplesQueue,
  bulkPostEventsQueue,
  createAuditEventsQueue,
}; // exports
