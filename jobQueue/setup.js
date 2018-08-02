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
const featureToggles = require('feature-toggles');
const urlParser = require('url');
const kue = require('kue');
const activityLogUtil = require('../utils/activityLog');

const redisOptions = {
  redis: conf.redis.instanceUrl.queue,
};

const redisInfo = urlParser.parse(redisOptions.redis, true);
if (redisInfo.protocol !== PROTOCOL_PREFIX) {
  redisOptions.redis = 'redis:' + redisOptions.redis;
}

const jobQueue = kue.createQueue(redisOptions);

/**
 * Kue's Queue graceful shutdown.
 */
function gracefulShutdown() {
  const start = Date.now();
  jobQueue.shutdown(conf.kueShutdownTimeout, (err) => {
    if (featureToggles.isFeatureEnabled('enableSigtermActivityLog')) {
      // lint disabled Since the status string allows spaces/special characters
      // eslint-disable-next-line quotes
      const status = "Job queue shutdown: " + (err || "OK"); // jscs:ignore validateQuoteMarks
      const logWrapper = {
        status,
        totalTime: `${Date.now() - start}ms`,
      };
      activityLogUtil.printActivityLogString(logWrapper, 'sigterm');
    }
  });
}

jobQueue.on('error', (err) => {
  console.error('Kue Error!', err); // eslint-disable-line no-console
});

if (featureToggles.isFeatureEnabled('instrumentKue')) {
  jobQueue.on('job enqueue', (id, type) => {
    console.log('[KJI] enqueued: ' + // eslint-disable-line no-console
      'id=%s type=%s', id, type);
  });
}

module.exports = {
  jobConcurrency: {
    BULK_CREATE_AUDIT_EVENTS: conf.getBulkCreateAuditEventJobConcurrency,
    BULKUPSERTSAMPLES: conf.bulkUpsertSampleJobConcurrency,
    GET_HIERARCHY: conf.getHierarchyJobConcurrency,
    BULK_DELETE_SUBJECTS: conf.getBulkDeleteSubjectsJobConcurrency,
    JOB_CLEANUP: 1,
    PERSIST_SAMPLE_STORE: 1,
    SAMPLE_TIMEOUT: 1,
    CHECK_MISSED_COLLECTOR_HEARTBEAT: 1,
  },
  jobQueue,
  gracefulShutdown,
  jobType: {
    BULK_CREATE_AUDIT_EVENTS: 'BULK_CREATE_AUDIT_EVENTS',
    BULKUPSERTSAMPLES: 'bulkUpsertSamples',
    GET_HIERARCHY: 'GET_HIERARCHY',
    JOB_CLEANUP: 'JOB_CLEANUP',
    PERSIST_SAMPLE_STORE: 'PERSIST_SAMPLE_STORE',
    SAMPLE_TIMEOUT: 'SAMPLE_TIMEOUT',
    BULK_DELETE_SUBJECTS: 'bulkDeleteSubjects',
    CHECK_MISSED_COLLECTOR_HEARTBEAT: 'CHECK_MISSED_COLLECTOR_HEARTBEAT',
  },
  ttlForJobsAsync: conf.JOB_QUEUE_TTL_SECONDS_ASYNC,
  ttlForJobsSync: conf.JOB_QUEUE_TTL_SECONDS_SYNC,
  delayToRemoveJobs: conf.JOB_REMOVAL_DELAY_SECONDS,
  kue,
}; // exports
