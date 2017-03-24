/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * clock/scheduledJobs/sampleTimeoutJob.js
 *
 * Executes the sample timeout process. If worker process is enabled, enqueues
 * a job, otherwise just executes work directly in this process.
 */
const featureToggles = require('feature-toggles');
const dbSample = require('../../db/index').Sample;
const dbSubject = require('../../db/index').Subject;
const publisher = require('../../realtime/redisPublisher');
const sampleEvent = require('../../realtime/constants').events.sample;
const sampleStoreTimeout = require('../../cache/sampleStoreTimeout');

/**
 * Execute the call to check for sample timeouts.
 *
 * @returns {Promise}
 */
function execute() {
  const sampleHandle = featureToggles
              .isFeatureEnabled('enableRedisSampleStore') ?
              sampleStoreTimeout : dbSample;

  return sampleHandle.doTimeout()
  .then((dbRes) => {
    // send the timeoutsample to the client by publishing it to redis channel
    if (dbRes.timedOutSamples) {
      dbRes.timedOutSamples.forEach((sample) => {
        publisher.publishSample(sample, dbSubject, sampleEvent.upd);
      });
    }

    return Promise.resolve(dbRes);
  });
} // execute

module.exports = {
  enqueue() {
    if (featureToggles.isFeatureEnabled('enableWorkerProcess')) {
      const jobWrapper = require('../../jobQueue/jobWrapper');
      const jobType = require('../../jobQueue/setup').jobType;
      const j = jobWrapper.createJob(
        jobType.SAMPLE_TIMEOUT, { reqStartTime: Date.now() }
      );
      return Promise.resolve(true);
    }

    // If not using worker process, execute directly;
    return execute();
  },

  execute,
};
