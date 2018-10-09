/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /worker/jobs/bulkUpsertSamples.js
 */
const logger = require('winston');
const subHelper = require('../../api/v1/helpers/nouns/subjects');
const featureToggles = require('feature-toggles');
const activityLogUtil = require('../../utils/activityLog');
const cacheSampleModel = require('../../cache/models/samples');
const publisher = require('../../realtime/redisPublisher');
const jobLog = require('../jobLog');

module.exports = (job, done) => {
  /*
   * The shape of the old jobs objects in redis is different from the shape
   * of the new job objects that will be inserted in redis. The following
   * check is done to get the sample data based on the shape of the object.
   * The old job objects look like this {data : [sample1, sample2]} and
   * the new ones look like this
   *  {data: {upsertData: [sample1,sample2], user: { name, email, ...}}}
   */
  const jobStartTime = Date.now();
  const samples = job.data.length ? job.data : job.data.upsertData;
  const user = job.data.user;
  const reqStartTime = job.data.reqStartTime;
  const readOnlyFields = job.data.readOnlyFields;
  const errors = [];
  if (featureToggles.isFeatureEnabled('instrumentKue')) {
    const msg =
      `[KJI] Entered bulkUpsertSamples.js: job.id=${job.id} ` +
      `sampleCount=${samples.length}`;
    console.log(msg); // eslint-disable-line no-console
  }

  const dbStartTime = Date.now();
  let dbEndTime;
  let successCount = 0;
  cacheSampleModel.bulkUpsertByName(samples, user, readOnlyFields)
    .then((results) => {
      dbEndTime = Date.now();
      /*
       * For each result, if there was an error, track the error to return to
       * to the caller when they check status. If no error, publish the sample
       * to the redis channel.
       */
      return Promise.all(results.map((result) => {
        if (result.isFailed) {
          errors.push(result.explanation);
          return Promise.resolve();
        }

        successCount++;
        if (featureToggles.isFeatureEnabled('publishSampleInPromiseChain')) {
          // Wait for publish to complete before resolving the promise.
          return publisher.publishSample(result, subHelper.model);
        }

        /*
         * Resolve the promise right away, *before* we actually publish
         * the sample. Under heavy load, publish a sample can get backed up
         * because we are looking up the subject info and including that in
         * the payload of the real-time event.
         */
        publisher.publishSample(result, subHelper.model);
        return Promise.resolve();
      }));
    })
    .then(() => {
      const objToReturn = {};

      // attach the errors from "bulkUpsertByName"
      objToReturn.errors = errors;
      if (featureToggles.isFeatureEnabled('enableWorkerActivityLogs')) {
        const jobEndTime = Date.now();

        // number of successful upserts
        objToReturn.recordCount = successCount;

        // number of failed upserts
        objToReturn.errorCount = errors.length;

        const tempObj = {
          jobStartTime,
          jobEndTime,
          reqStartTime,
          dbStartTime,
          dbEndTime,
        };

        // update time parameters in object to return.
        activityLogUtil.updateActivityLogParams(objToReturn, tempObj);
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
      logger.error('Caught error from /worker/jobs/bulkUpsertSamples:', err);
      jobLog(jobStartTime, job, err.message || '');
      return done(err);
    });
};
