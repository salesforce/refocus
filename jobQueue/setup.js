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
const redisOptions = {
  redis: conf.redis.instanceUrl.queue,
};
const redisInfo = urlParser.parse(redisOptions.redis, true);
if (redisInfo.protocol !== PROTOCOL_PREFIX) {
  redisOptions.redis = 'redis:' + redisOptions.redis;
}

const jobQueue = kue.createQueue(redisOptions);
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
    BULKUPSERTSAMPLES: conf.bulkUpsertSampleJobConcurrency,
    PERSIST_SAMPLE_STORE: 1,
    SAMPLE_TIMEOUT: 1,
  },
  jobQueue,
  jobType: {
    BULKUPSERTSAMPLES: 'bulkUpsertSamples',
    PERSIST_SAMPLE_STORE: 'PERSIST_SAMPLE_STORE',
    SAMPLE_TIMEOUT: 'SAMPLE_TIMEOUT',
  },
  ttlForJobs: conf.JOB_QUEUE_TTL_SECONDS,
  delayToRemoveJobs: conf.JOB_REMOVAL_DELAY_SECONDS,
  kue,
}; // exports
