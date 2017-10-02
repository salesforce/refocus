/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /worker/jobs/getHierarchyJob.js
 */
const featureToggles = require('feature-toggles');
const activityLogUtil = require('../../utils/activityLog');
const doGetHierarchy = require('../../api/v1/helpers/verbs/doGetHierarchy');
const errors = require('errors');

module.exports = (job, done) => {
  const jobStartTime = Date.now();
  doGetHierarchy(job.data)
  .then((resultObj) => {
    if (featureToggles.isFeatureEnabled('enableWorkerActivityLogs')) {
      const jobEndTime = Date.now();
      const tempObj = {
        jobStartTime,
        jobEndTime,
        reqStartTime: resultObj.reqStartTime,
        dbStartTime: resultObj.dbStartTime,
        dbEndTime: resultObj.dbEndTime,
      };

      // update time parameters in resultObj
      activityLogUtil.updateActivityLogParams(resultObj, tempObj);
    }

    return done(null, resultObj);
  })
  .catch((err) => {
    if (errors.isError(err)) {
      const errString = JSON.stringify(err);
      done(errString);
    } else {
      // Native errors have non-enumerable properties. Specify props to include.
      const props = Object.getOwnPropertyNames(err);
      props.push('name');
      const errString = JSON.stringify(err, props);
      done(errString);
    }
  });
};
