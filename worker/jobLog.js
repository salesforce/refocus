/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /worker/jobLog.js
 */
const featureToggles = require('feature-toggles');
const activityLogUtil = require('../utils/activityLog');

module.exports = (startTime, job, description) => {
  if (featureToggles.isFeatureEnabled('enableJobActivityLogs')) {
    const jobLog = {
      jobId: job.id,
      jobType: job.type,
      process: process.env.DYNO || process.pid,
      totalTime: `${Date.now() - startTime}ms`,
    };
    if (description) jobLog.description = `"${description}"`;
    activityLogUtil.printActivityLogString(jobLog, 'job');
  }
};
