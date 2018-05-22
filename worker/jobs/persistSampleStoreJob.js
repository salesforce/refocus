/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /worker/jobs/persistSampleStoreJob.js
 */
const logger = require('winston');
const featureToggles = require('feature-toggles');
const scheduledJob =
  require('../../clock/scheduledJobs/persistSampleStoreJob');
const activityLogUtil = require('../../utils/activityLog');
const ZERO = 0;
const jobLog = require('../jobLog');

module.exports = (job, done) => {
  if (featureToggles.isFeatureEnabled('instrumentKue')) {
    const msg = '[KJI] Entered persistSampleStoreJob.js';
    console.log(msg); // eslint-disable-line no-console
  }

  const jobStartTime = Date.now();
  const reqStartTime = job.data.reqStartTime;
  const dbStartTime = Date.now();
  scheduledJob.execute()
  .then((num) => {
    if (featureToggles.isFeatureEnabled('enableWorkerActivityLogs')) {
      const dbEndTime = Date.now();
      const jobEndTime = Date.now();
      const objToReturn = {};

      if (num === ZERO || num > ZERO) {
        objToReturn.recordCount = num;
      }

      const tempObj = {
        jobStartTime,
        jobEndTime,
        reqStartTime,
        dbStartTime,
        dbEndTime,
      };

      // update time parameters in object to return.
      activityLogUtil.updateActivityLogParams(objToReturn, tempObj);
      jobLog(jobStartTime, job);
      return done(null, objToReturn);
    }

    jobLog(jobStartTime, job);
    return done();
  })
  .catch((err) => {
    logger.error('Caught error from /worker/jobs/persistSampleStoreJob:', err);
    jobLog(jobStartTime, job, err.message || '');
    return done(err);
  });
};
