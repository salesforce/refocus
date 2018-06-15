/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /worker/jobs/bulkDeleteSubjectsJob.js
 */
const logger = require('winston');
const subjectHelper = require('../../api/v1/helpers/nouns/subjects');
const featureToggles = require('feature-toggles');
const activityLogUtil = require('../../utils/activityLog');
const subjectCacheModel = require('../../cache/models/subject');
const publisher = require('../../realtime/redisPublisher');
const jobLog = require('../jobLog');

/**
 * Update activity log using activityLogUtil
 * @param objToReturn
 * @param jobStartTime
 * @param reqStartTime
 * @param dbStartTime
 * @param dbEndTime
 */
// eslint-disable-next-line max-params
function updateActivityLogs(objToReturn, jobStartTime, reqStartTime,
                            dbStartTime, dbEndTime) {
  const jobEndTime = Date.now();
  activityLogUtil.updateActivityLogParams(objToReturn, {
    jobStartTime,
    jobEndTime,
    reqStartTime,
    dbStartTime,
    dbEndTime,
  });
}

module.exports = (job, done) => {
  const jobStartTime = Date.now();

  // const user = job.data.user; // TODO not sure if needed.
  const reqStartTime = job.data.reqStartTime;
  const subjects = job.data.subjects;
  const user = job.data.user;
  const readOnlyFields = job.data.readOnlyFields; // TODO not sure if needed.
  const errors = [];

  if (featureToggles.isFeatureEnabled('instrumentKue')) {
    const msg = `[KJI] Entered bulkDeleteSubjectsJob.js: job.id=${job.id} ` +
      `SubjectsToDelete=${subjects.length}`;
    console.log(msg); // eslint-disable-line no-console
  }

  const dbStartTime = Date.now();
  subjectCacheModel.bulkDelete(subjects, readOnlyFields, user)
    .then((results) => {
      const dbEndTime = Date.now();
      let errorCount = 0;

      /*
       * Counts failed and successful promises.
       * Send to the client via redis channel successful promises.
       */
      for (let i = 0; i < results.length; i++) {
        if (results[i].isFailed) {
          errorCount++;
          errors.push(results[i].explanation);
        } else {
          publisher.publishSample(results[i], subjectHelper.model);
        }
      }

      const objToReturn = {};
      objToReturn.errors = errors;
      objToReturn.errorCount = errorCount;
      const successCount = results.length - errorCount;
      objToReturn.recordCount = successCount;
      if (featureToggles.isFeatureEnabled('enableWorkerActivityLogs')) {
        updateActivityLogs(objToReturn, successCount, errorCount, jobStartTime,
          reqStartTime, dbStartTime, dbEndTime);
      }

      /*
       * passing an object as the second argument of done maps it to the
       * "results" key and attaches it to a hash identified by q:job:{jobId},
       * to be stored in redis
       */
      jobLog(jobStartTime, job);
      return done(null, objToReturn);
    })
    .catch((err) => {
      const errorMsg = 'Caught error from /worker/jobs/bulkDeleteSubjectsJob:';
      logger.error(errorMsg, err);
      jobLog(jobStartTime, job, err.message || '');
      return done(err);
    });
};
