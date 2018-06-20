/**
 * Copyright (c) 2018, salesforce.com, inc.
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

module.exports = (job, done) => {
  const jobStartTime = Date.now();
  const reqStartTime = job.data.reqStartTime;
  const subjectKeys = job.data.subjects;
  const user = job.data.user;
  const readOnlyFields = job.data.readOnlyFields;
  const errors = [];

  if (featureToggles.isFeatureEnabled('instrumentKue')) {
    const msg = `[KJI] Entered bulkDeleteSubjectsJob.js: job.id=${job.id} ` +
      `SubjectsToDelete=${subjectKeys.length}`;
    console.log(msg); // eslint-disable-line no-console
  }

  const dbStartTime = Date.now();
  let dbEndTime;
  let successCount = 0;

  subjectCacheModel.bulkDelete(subjectKeys, readOnlyFields, user)
    .then((results) => {
      // Split success and failures
      dbEndTime = Date.now();
      return Promise.all(results.map((result) => {
        if (result.isFailed) {
          errors.push(result.explanation);
          return Promise.resolve();
        }

        successCount++;
        publisher.publishObject(result, subjectHelper.model);
        return Promise.resolve();
      }));
    })
    .then(() => {
      const jobResultData = {};
      jobResultData.jobId = job.id;
      jobResultData.errors = errors;
      if (featureToggles.isFeatureEnabled('enableWorkerActivityLogs')) {
        const jobEndTime = Date.now();
        jobResultData.recordCount = successCount;
        jobResultData.errorCount = errors.length;
        activityLogUtil.updateActivityLogParams(jobResultData, {
          jobStartTime,
          jobEndTime,
          reqStartTime,
          dbStartTime,
          dbEndTime,
        });
      }

      jobLog(jobStartTime, job);
      return done(null, jobResultData);
    })
    .catch((err) => {
      logger.error('Error /worker/jobs/bulkDeleteSubjectsJob:', err);
      jobLog(jobStartTime, job, err.message || '');
      return done(err);
    });
};
