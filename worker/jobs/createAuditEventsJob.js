/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /worker/jobs/createAuditEventsJob.js
 */
const logger = require('winston');
const auditEvent = require('../../api/v1/helpers/nouns/auditEvents').model;
const featureToggles = require('feature-toggles');
const activityLogUtil = require('../../utils/activityLog');

module.exports = (job, done) => {
  const jobStartTime = Date.now();
  const auditEvents = job.data.auditEvents;
  const reqStartTime = job.data.reqStartTime;
  const dbStartTime = Date.now();
  auditEvent.bulkCreate(auditEvents)
    .then((results) => {
      if (featureToggles.isFeatureEnabled('enableWorkerActivityLogs')) {
        const dbEndTime = Date.now();
        const jobEndTime = Date.now();
        const objToReturn = {};

        // recordCount = # of successful inserts
        objToReturn.recordCount = results.length;
        const tempObj = {
          jobStartTime,
          jobEndTime,
          reqStartTime,
          dbStartTime,
          dbEndTime,
        };

        // update time parameters in object to return.
        activityLogUtil.updateActivityLogParams(objToReturn, tempObj);
        return done(null, objToReturn);
      }

      return done();
    })
    .catch((err) => {
      logger.error('Caught error from /worker/jobs/createAuditEventsJob:', err);
      return done(err);
    });
};
