/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /worker/jobs/bulkUpsertSamplesJob.js
 */
const helper = require('../../api/v1/helpers/nouns/samples');
const subHelper = require('../../api/v1/helpers/nouns/subjects');
const featureToggles = require('feature-toggles');
const activityLogUtil = require('../../utils/activityLog');
const cacheSampleModel = require('../../cache/models/samples');
const publisher = require('../../realtime/redisPublisher');

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
      `[KJI] Entered bulkUpsertSamplesJob.js: job.id=${job.id} ` +
      `sampleCount=${samples.length}`;
    console.log(msg); // eslint-disable-line no-console
  }

  const dbStartTime = Date.now();
  const sampleModel =
    featureToggles.isFeatureEnabled('enableRedisSampleStore') ?
      cacheSampleModel : helper.model;

  sampleModel.bulkUpsertByName(samples, user, readOnlyFields)
    .then((results) => {
      let errorCount = 0;

      /*
       * count failed promises and send the good samples to the client by
       * publishing it to the redis channel
       */
      for (let i = 0; i < results.length; i++) {
        if (results[i].isFailed) {
          errorCount++;

          // we just need "explanation" to be added to the errors
          errors.push(results[i].explanation);
        } else {
          publisher.publishSample(results[i], subHelper.model);
        }
      }

      const objToReturn = {};

      // attach the errors from "bulkUpsertByName"
      objToReturn.errors = errors;
      if (featureToggles.isFeatureEnabled('enableWorkerActivityLogs')) {
        const dbEndTime = Date.now();

        // number of successful upserts
        objToReturn.recordCount = results.length - errorCount;

        // number of failed upserts
        objToReturn.errorCount = errorCount;

        const tempObj = {
          jobStartTime,
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
      return done(null, objToReturn);
    });
};
