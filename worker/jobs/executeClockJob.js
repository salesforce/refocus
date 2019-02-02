/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /worker/jobs/executeClockJob.js
 */
const logger = require('winston');
const featureToggles = require('feature-toggles');
const activityLogUtil = require('../../utils/activityLog');
const jobLog = require('../jobLog');

module.exports = (job, done) => {
  const { reqStartTime, clockJobName } = job.data;
  if (featureToggles.isFeatureEnabled('instrumentKue')) {
    const msg = `[KJI] Entered executeClockJob.js (${clockJobName})`;
    console.log(msg); // eslint-disable-line no-console
  }

  const jobStartTime = Date.now();

  /*
   * Don't bother trying to execute anything if for some reason we don't have a
   * clockJobName here. But do add some extra logging to get to the bottom of
   * why we're getting here with clockJobName "undefined" (which causes worker
   * dyno to crash with
   * "Error: Cannot find module '../../clock/scheduledJobs/undefined'".
   */
  if (!clockJobName) {
    console.trace('Missing Clock Job Name', job);
    return Promise.resolve();
  }

  const clockJob = require(`../../clock/scheduledJobs/${clockJobName}`);
  const dbStartTime = Date.now();

  return Promise.resolve()
  .then(clockJob.execute)
  .then((res) => {
    if (featureToggles.isFeatureEnabled('enableWorkerActivityLogs')) {
      const dbEndTime = Date.now();
      const jobEndTime = Date.now();
      const objToReturn = res || {};

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
    logger.error(`Caught error from /worker/jobs/executeClockJob (${clockJobName}):`, err);
    jobLog(jobStartTime, job, err.message || '');
    return done(err);
  });
};
