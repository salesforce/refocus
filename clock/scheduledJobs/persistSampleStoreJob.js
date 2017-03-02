/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * clock/scheduledJobs/persistSampleStoreJob.js
 *
 * Executes the process to save the redis sample store to postgres db. If
 * worker process is enabled, enqueues a job, otherwise just executes directly
 * in this process.
 */
const featureToggles = require('feature-toggles');
const sampleStore = require('../../cache/sampleStore');
const sampleStorePersist = require('../../cache/sampleStorePersist');
const jwr = '../../jobQueue/jobWrapper';
const jse = '../../jobQueue/setup';

/**
 * Execute the call to check for sample timeouts.
 *
 * @returns {Promise}
 */
function execute() {
  return sampleStorePersist.persist();
} // execute

module.exports = {
  enqueue() {
    if (featureToggles.isFeatureEnabled(sampleStore.constants.featureName)) {
      const jobWrapper = require(jwr); // eslint-disable-line global-require
      const jobType =
        require(jse).jobType; // eslint-disable-line global-require
      jobWrapper.createJob(jobType.PERSIST_SAMPLE_STORE,
        { reqStartTime: Date.now() });
      return Promise.resolve(true);
    }

    // If not using worker process, execute directly;
    return execute();
  },

  execute,
};
