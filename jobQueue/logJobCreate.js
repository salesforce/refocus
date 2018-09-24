/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /jobQueue/logJobCreate.js
 */
const featureToggles = require('feature-toggles');
const activityLogUtil = require('../utils/activityLog');

module.exports = (startTime, job) => {
  if (featureToggles.isFeatureEnabled('enableJobCreateActivityLogs')) {
    const jc = {
      jobId: job.id,
      jobPriority: job._priority,
      jobType: job.type,
      process: process.env.DYNO || process.pid,
      totalTime: `${Date.now() - startTime}ms`,
    };
    activityLogUtil.printActivityLogString(jc, 'jobCreate');
  }
};
