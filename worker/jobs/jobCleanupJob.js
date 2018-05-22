/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /worker/jobs/jobCleanupJob.js
 */
const logger = require('winston');
const featureToggles = require('feature-toggles');
const scheduledJob = require('../../clock/scheduledJobs/jobCleanup');
const activityLogUtil = require('../../utils/activityLog');
const conf = require('../../config');
const jobLog = require('../jobLog');

module.exports = (job, done) => {
  const jobStartTime = Date.now();
  const reqStartTime = job.data.reqStartTime;
  const dbStartTime = Date.now();

  scheduledJob.execute(conf.JOB_REMOVAL_BATCH_SIZE, conf.JOB_REMOVAL_DELAY)
  .then(() => {
    if (featureToggles.isFeatureEnabled('enableWorkerActivityLogs')) {
      const dbEndTime = Date.now();
      const jobEndTime = Date.now();
      const objToReturn = {};

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
    logger.error('Caught error from /worker/jobs/jobCleanupJob:', err);
    jobLog(jobStartTime, job, err.message || '');
    return done(err);
  });
};
