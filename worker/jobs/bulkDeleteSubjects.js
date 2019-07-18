/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /worker/jobs/bulkDeleteSubjects.js
 */
const logger = require('../../logger');
const subjectHelper = require('../../api/v1/helpers/nouns/subjects');
const featureToggles = require('feature-toggles');
const activityLogUtil = require('../../utils/activityLog');
const jobLog = require('../jobLog');
const utils = require('../../api/v1/helpers/verbs/utils');

/**
 * Delete subject by key.
 *
 * If the user has permission, remove subject from Postgres then from Redis
 * via hook.
 *
 * @param {String} key - subject id or absolute path
 * @param {Object} user
 * @returns {Promise} - Indicates success or failure.
 */
function deleteByKey(key, user) {
  const params = {};
  let deletedSubject;
  params.key = { value: key };
  return utils.findByKey(subjectHelper, params)
    .then((subject) => utils.isWritable({ user }, subject))
    .then((subject) => {
      deletedSubject = subject;
      return subject.destroy();
    })
    .then(() => Promise.resolve({ isFailed: false }))
    .catch((err) => Promise.resolve({ isFailed: true, explanation: err }));
}

/**
 * Executes bulk subject deletion.
 *
 * @param {Array} - List of subject keys, meaning that key is
 *  a string either subject id or absolutePath.
 * @param {Array} - nouns/subjects/readOnlyFields
 * @param {Object} - user
 * @returns [{Promise}] - Array of Promises where each promise resolves
 *  to indicate the success or failure of deleting one individual subject.
 */
function bulkDelete(subjectKeys, readOnlyFields, user) {
  if (!subjectKeys || !Array.isArray(subjectKeys) ||
    subjectKeys.length < 1) {
    const err = 'Must provide an array of one or more strings, where each ' +
      'string is a subject id or absolutePath.';
    return Promise.all(
      [Promise.resolve({ isFailed: true, explanation: err, })]
    );
  }

  const subjectDeletePromise = subjectKeys.map((key) => {
    try {
      return deleteByKey(key, user);
    } catch (err) {
      return Promise.resolve({ isFailed: true, explanation: err });
    }
  });
  return Promise.all(subjectDeletePromise);
}

module.exports = (job, done) => {
  const jobStartTime = Date.now();
  const reqStartTime = job.data.reqStartTime;
  const subjectKeys = job.data.subjects;
  const user = job.data.user;
  const readOnlyFields = job.data.readOnlyFields;
  const errors = [];

  if (featureToggles.isFeatureEnabled('instrumentKue')) {
    const msg = `[KJI] Entered bulkDeleteSubjects.js: job.id=${job.id} ` +
      `SubjectsToDelete=${subjectKeys.length}`;
    logger.info(msg); // eslint-disable-line no-console
  }

  const dbStartTime = Date.now();
  let dbEndTime;
  let successCount = 0;
  bulkDelete(subjectKeys, readOnlyFields, user)
    .then((results) => {
      // Split success and failures
      dbEndTime = Date.now();
      return Promise.all(results.map((result) => {
        if (result.isFailed) {
          let error = result.explanation;

          if (!featureToggles.isFeatureEnabled('enableBullForBulkDelSubj')) {
            // Kue doesn't handle native errors properly because they have
            // non-enumerable properties. Need to clone to a plain object.
            if (typeof error === 'object') {
              const props = ['name', ...Object.getOwnPropertyNames(error)];
              error = JSON.parse(JSON.stringify(error, props));
            }
          }

          errors.push(error);
          return Promise.resolve();
        }

        successCount++;
        return Promise.resolve();
      }));
    })
    .then(() => {
      const jobResultData = {};
      jobResultData.jobId = job.id;
      if (errors.length) {
        jobResultData.errors = errors;
      }

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
      jobResultData.requestInfo = job.data.requestInfo;
      return done(null, jobResultData);
    })
    .catch((err) => {
      logger.error('Error /worker/jobs/bulkDeleteSubjects:', err);
      jobLog(jobStartTime, job, err.message || '');
      return done(err);
    });
};
