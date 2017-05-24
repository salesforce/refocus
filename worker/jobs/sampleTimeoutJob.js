/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /worker/jobs/sampleTimeoutJob.js
 */
const featureToggles = require('feature-toggles');
const scheduledJob = require('../../clock/scheduledJobs/sampleTimeoutJob');
const activityLogUtil = require('../../utils/activityLog');

module.exports = (job, done) => {
  if (featureToggles.isFeatureEnabled('instrumentKue')) {
    const msg = '[KJI] Entered sampleTimeoutJob.js';
    console.log(msg); // eslint-disable-line no-console
  }

  const jobStartTime = Date.now();
  const reqStartTime = job.data.reqStartTime;
  const dbStartTime = Date.now();
  scheduledJob.execute()
  .then((dbRes) => {
    if (featureToggles.isFeatureEnabled('enableWorkerActivityLogs')) {
      const dbEndTime = Date.now();
      const objToReturn = {};

      // recordCount = number of successul timeouts
      objToReturn.recordCount = dbRes.numberTimedOut;

      // errorCount = number of samples that did not time out
      objToReturn.errorCount = dbRes.numberEvaluated - dbRes.numberTimedOut;
      const tempObj = {
        jobStartTime,
        reqStartTime,
        dbStartTime,
        dbEndTime,
      };

      // update time parameters in object to return.
      activityLogUtil.updateActivityLogParams(objToReturn, tempObj);
      return done(null, objToReturn);
    }

    return done();
  });
};
