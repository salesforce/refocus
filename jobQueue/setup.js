/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /jobQueue/setup.js
 *
 * Setup the "Kue" library to process background jobs. Declare all job types to
 * be processed by the workers in the jobType object.
 */
'use strict'; // eslint-disable-line strict
const PROTOCOL_PREFIX = 'redis:';
const conf = require('../config');
const logger = require('@salesforce/refocus-logging-client');
const featureToggles = require('feature-toggles');
const urlParser = require('url');
const kue = require('kue');
const BullQueue = require('bull');
const Promise = require('bluebird');
const activityLogUtil = require('../utils/activityLog');
const jobQueues = [];
const redisOptions = {
  redis: conf.redis.instanceUrl.queue,
};

let redisUrlForBull = redisOptions.redis;

const redisInfo = urlParser.parse(redisOptions.redis, true);
if (redisInfo.protocol !== PROTOCOL_PREFIX) {
  redisOptions.redis = 'redis:' + redisOptions.redis;
  redisUrlForBull = 'redis:' + redisUrlForBull;
}
console.log(`RedisUrlForBull = ${redisUrlForBull}`);

/**
 * Creates a job queue and adds it to the list of queues
 * @param {string} name  - Name of the new queue
 * @param {string} redisUrl  - Url of redis instance
 * @param {Array} jobQueueList  - the list of current job queues
 * @returns {BullQueue} the newly created job queue
 */
function createBullJobQueue(name, redisUrl, jobQueueList) {
  const newJobQueue = new BullQueue(name, redisUrl);
  jobQueueList.push(newJobQueue);
  return newJobQueue;
}

const jobQueue = kue.createQueue(redisOptions);

const bulkDelSubQueue = createBullJobQueue(conf.jobType.bulkDeleteSubjects,
  redisUrlForBull, jobQueues);
const executeClockJobQueue = createBullJobQueue(conf.executeClockJob,
  redisUrlForBull, jobQueues);
const bulkUpsertSamplesQueue = createBullJobQueue(conf.jobType.bulkUpsertSamples,
  redisUrlForBull, jobQueues);
const bulkPostEventsQueue = createBullJobQueue(conf.jobType.bulkPostEvents,
  redisUrlForBull, jobQueues);
const createAuditEventsQueue = createBullJobQueue(conf.jobType.createAuditEvents,
  redisUrlForBull, jobQueues);

function resetJobQueue() {
  return Promise.map(jobQueue.workers, (w) =>
    new Promise((resolve) => w.shutdown(resolve))
  )
  .then(() => {
    jobQueue.workers = [];
    jobQueues.forEach((queue) => {
      queue.empty();
    });
  });
}

/**
 * Kue's Queue graceful shutdown.
 */
function gracefulShutdown() {
  const start = Date.now();
  function printLog(status) {
    const logWrapper = {
      status,
      totalTime: `${Date.now() - start}ms`,
    };
    activityLogUtil.printActivityLogString(logWrapper, 'sigterm');
  }

  Promise.map(jobQueues, (queue) => queue.close())
    .then(() => {
      if (featureToggles.isFeatureEnabled('enableSigtermActivityLog')) {
        const status = '"Bull Job queue shutdown: OK"';
        printLog(status);
      }

      return jobQueue.shutdown(conf.kueShutdownTimeout, (err) => {
        if (featureToggles.isFeatureEnabled('enableSigtermActivityLog')) {
          const status = '"Kue Job queue shutdown: ' + (err || 'OK') + '"';
          printLog(status);
        }
      });
    })
    .catch((err) => {
      if (featureToggles.isFeatureEnabled('enableSigtermActivityLog')) {
        const status = '"Kue Job queue shutdown: ' + err + '"';
        printLog(status);
      }
    });
}

jobQueue.on('error', (err) => {
  logger.error('Kue Error!', err);
});

if (featureToggles.isFeatureEnabled('instrumentKue')) {
  jobQueue.on('job enqueue', (id, type) => {
    logger.info('[KJI] enqueued: ' +
      'id=%s type=%s', id, type);
  });
}

module.exports = {
  jobType: conf.jobType,
  jobQueue,
  resetJobQueue,
  gracefulShutdown,
  ttlForJobsAsync: conf.JOB_QUEUE_TTL_SECONDS_ASYNC,
  ttlForJobsSync: conf.JOB_QUEUE_TTL_SECONDS_SYNC,
  delayToRemoveJobs: conf.JOB_REMOVAL_DELAY_SECONDS,
  kue,
  bulkDelSubQueue,
  executeClockJobQueue,
  bulkUpsertSamplesQueue,
  bulkPostEventsQueue,
  createAuditEventsQueue,

}; // exports
