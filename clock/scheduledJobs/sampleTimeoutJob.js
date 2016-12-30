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

module.exports = {
  execute() {
    if (featureToggles.isFeatureEnabled('useWorkerProcess')) {
      const jobWrapper = require('../../jobQueue/jobWrapper');
      const jobType = require('../../jobQueue/setup');
      jobWrapper.createJob(jobType.SAMPLE_TIMEOUT);
      return Promise.resolve(true);
    }

    const dbSample =
      require('../../db/index').Sample; // eslint-disable-line global-require
    return dbSample.doTimeout();
  },
};
