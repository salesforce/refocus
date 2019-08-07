/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /worker/jobs/bulkPostEvents.js
 */

const logger = require('@salesforce/refocus-logging-client');
const featureToggles = require('feature-toggles');
const activityLogUtil = require('../../utils/activityLog');
const eventModel = require('./../../db/index.js').Event;
const jobLog = require('../jobLog');

module.exports = (job, done) => {
  const jobStartTime = Date.now();
  const events = job.data.length ? job.data : job.data.createData;
  const user = job.data.user;
  const reqStartTime = job.data.reqStartTime;
  const errors = [];
  if (featureToggles.isFeatureEnabled('instrumentKue')) {
    const msg =
      `[KJI] Entered bulkPostEvents.js: job.id=${job.id} ` +
      `eventCount=${events.length}`;
    logger.info(msg); // eslint-disable-line no-console
  }

  const dbStartTime = Date.now();
  let dbEndTime;
  let successCount = 0;

  eventModel.bulkCreate(events, user)
    .then((events) => {
      dbEndTime = Date.now();
      return Promise.all(events.map((result) => {
        if (result.isFailed) {
          errors.push(result.explanation);
          return Promise.resolve();
        }

        successCount++;
        return done();
      }));
    })
    .then(() => {
      const objToReturn = {};
      objToReturn.errors = errors; // Attaching errors from bulkCreate

      if (featureToggles.isFeatureEnabled('enableWorkerActivityLogs')) {
        const jobEndTime = Date.now();
        objToReturn.recordCount = successCount; // # of successful creates
        objToReturn.errorCount = errors.length; // # of failed creates

        const tempObj = {
          jobStartTime,
          jobEndTime,
          reqStartTime,
          dbStartTime,
          dbEndTime,
        };

        // Update time parameters in object to return.
        activityLogUtil.updateActivityLogParams(objToReturn, tempObj);
      }

      jobLog(jobStartTime, job);
      return done(null, objToReturn);
    })
    .catch((err) => {
      logger.error('Caught error from /worker/jobs/bulkPostEvents:', err);
      jobLog(jobStartTime, job, err.message || '');
      return done(err);
    });
};
