/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /worker/jobProcessor.js
 *
 * The jobProcessor is a worker process which uses the "Kue" module to pull
 * jobs off the redis queue.
 *
 * Add a new jobQueue.process(...) block for each new type of job.
 */
'use strict'; // eslint-disable-line strict
const jobType = require('../jobQueue/setup').jobType;
const jobQueue = require('../jobQueue/jobWrapper').jobQueue;
const helper = require('../api/v1/helpers/nouns/samples');
const subHelper = require('../api/v1/helpers/nouns/subjects');
const featureToggles = require('feature-toggles');
const activityLogUtil = require('../utils/activityLog');
const cacheSampleModel = require('../cache/models/samples');
const publisher = require('../realtime/redisPublisher');
const sampleEvent = require('../realtime/constants').events.sample;

const workerStarted = 'Worker Process Started';
console.log(workerStarted); // eslint-disable-line no-console

// Process Sample Bulk Upsert Operations
jobQueue.process(jobType.BULKUPSERTSAMPLES, (job, done) => {
  /*
   * The shape of the old jobs objects in redis is different from the shape
   * of the new job objects that will be inserted in redis. The following
   * check is done to get the sample data based on the shape of the object.
   *  The old job objects look like this {data : [sample1, sample2]} and
   * the new ones look like this
   *  {data: {upsertData: [sample1,sample2], userName: 'name'}}
   */
  const jobStartTime = Date.now();
  const samples = job.data.length ? job.data : job.data.upsertData;
  const userName = job.data.userName;
  const reqStartTime = job.data.reqStartTime;

  // const msg = `Processing ${jobType.BULKUPSERTSAMPLES} job ${job.id} ` +
  //   `with ${samples.length} samples`;
  // console.log(msg); // eslint-disable-line no-console

  const dbStartTime = Date.now();

  let bulkUpsertPromise;
  if (featureToggles.isFeatureEnabled('enableRedisSampleStore')) {
    bulkUpsertPromise = cacheSampleModel.bulkUpsertSample(samples, userName);
  } else {
    bulkUpsertPromise = helper.model.bulkUpsertByName(samples, userName);
  }

  bulkUpsertPromise.then((results) => {
    let errorCount = 0;

    /*
     * count failed promises and send the good samples to the client by
     * publishing it to the redic channel
     */
    for (let i = 0; i < results.length; i++) {
      if (results[i].isFailed) {
        errorCount++;
      } else {
        publisher.publishSample(results[i], subHelper.model);
      }
    }

    if (featureToggles.isFeatureEnabled('enableWorkerActivityLogs')) {
      const dbEndTime = Date.now();
      const objToReturn = {};

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
      return done(null, objToReturn);
    }

    return done();
  });
});

// Process Sample Timeout Operations
jobQueue.process(jobType.SAMPLE_TIMEOUT, (job, done) => {
  const jobStartTime = Date.now();
  const reqStartTime = job.data.reqStartTime;

  const sampleTimeoutJob = require('../clock/scheduledJobs/sampleTimeoutJob');

  // const msg = `Processing ${jobType.SAMPLE_TIMEOUT} job ${job.id}`;
  // console.log(msg); // eslint-disable-line no-console

  const dbStartTime = Date.now();
  sampleTimeoutJob.execute()
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
});
