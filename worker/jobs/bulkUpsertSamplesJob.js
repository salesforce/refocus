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
const logger = require('winston');
const subHelper = require('../../api/v1/helpers/nouns/subjects');
const featureToggles = require('feature-toggles');
const activityLogUtil = require('../../utils/activityLog');
const cacheSampleModel = require('../../cache/models/samples');
const publisher = require('../../realtime/redisPublisher');
const conf = require('../../config');
const configUtil = require('../../config/configUtil');
const maxPayload = configUtil.convertToBytes(conf.payloadLimit);

// Give active jobs chance to  complete before "pause" calls graceful shutdown.
const DELAY_MS = 5000;

module.exports = (job, ctx, done) => {
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

  /**
   * Pauses processing jobs of this job type on this worker. Resumes when we
   * have enough available memory to process a new job.
   */
  function pauseFunc(err) {
    if (err) console.error('Error pausing "bulkUpsertSamples" jobs', err);

    console.log(new Date(), 'Pause "bulkUpsertSamples" jobs');

    // Resume when we have enough available memory
    let avl = configUtil.availableMemory();
    while (avl <= maxPayload) {
      setTimeout(() => { avl = configUtil.availableMemory(); }, 1000);
    }

    if (avl > maxPayload) {
      console.log(new Date(), 'Resume "bulkUpsertSamples" jobs');
      ctx.resume();
    }
  } // pauseFunc

  if (featureToggles.isFeatureEnabled('instrumentKue')) {
    const msg =
      `[KJI] Entered bulkUpsertSamplesJob.js: job.id=${job.id} ` +
      `sampleCount=${samples.length}`;
    console.log(msg); // eslint-disable-line no-console
  }

  const dbStartTime = Date.now();
  cacheSampleModel.bulkUpsertByName(samples, user, readOnlyFields)
  .then((results) => {
    const dbEndTime = Date.now();
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
      const jobEndTime = Date.now();

      // number of successful upserts
      objToReturn.recordCount = results.length - errorCount;

      // number of failed upserts
      objToReturn.errorCount = errorCount;

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

    return objToReturn;
  })
  .then((obj) => {
    /*
     * Check if we have enough memory to handle another job after this. This
     * doesn't block returning "done" for *this* job.
     */
    if (maxPayload > 0 && configUtil.availableMemory() <= maxPayload) {
      ctx.pause(DELAY_MS, pauseFunc);
    }

    /*
     * Passing an object as the second argument of done maps it to the
     * "results" key and attaches it to a hash identified by q:job:{jobId},
     * to be stored in redis.
     */
    console.log(new Date(), 'returning "done" for *this* job');
    return done(null, obj);
  })
  .catch((err) => {
    logger.error('Caught error from /worker/jobs/bulkUpsertSamplesJob:', err);
    return done(err);
  });
};
