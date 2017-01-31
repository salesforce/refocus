/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /utils/apiLog.js
 *
 */
'use strict'; // eslint-disable-line strict
const jwtUtil = require('./jwtUtil');
const featureToggles = require('feature-toggles');
const activityLogUtil = require('./activityLog');

/**
 * Returns the number of characters in the object.
 * This may not equal the number of bytes in memory, as JS
 * is UTF 16 --> variable length encoding.
 * @param {Object} obj
 * @returns {Integer} Number of characters of the input object
 */
function getSize(obj) {
  return JSON.stringify(obj).length;
}

/**
 * Set log object params from API results.
 * @param {Object} resultObj - API result object
 * @param {Object} logObject - from the request object
 * @param {Object or Array} retval - the returned object
 */
function mapApiResultsToLogObject(resultObj, logObject, retval) {
  const { reqStartTime, dbTime } = resultObj;

  // set the totalTime: duration in ms between start time and now
  if (reqStartTime) {
    logObject.totalTime = `${Date.now() - reqStartTime}ms`;
  }

  // set the duration for the database call(s), in ms
  if (dbTime) {
    logObject.dbTime = `${dbTime}ms`;
  }

  // set the size of the returned JSON value, and the number of
  // records returned
  if (retval) {
    // if retval is array, recordCount is array size
    let recordCount = 0;
    if (Array.isArray(retval)) {
      recordCount = retval.length;
    } else if (Object.keys(retval).length) {
      // if retval is a non-emty object, set recordCount to 1
      recordCount = 1;
    }

    logObject.recordCount = recordCount;
    logObject.responseBytes = getSize(retval);
  }
}

/**
 * Combine params from the api and request
 * and log the result
 * @param {Object} resultObj - API result object
 * @param {Object} logObject - from the request object
 * @param {Object or Array} retval - the returned object
 */
function combineAndLog(resultObj, logObject, retval) {
  // in-place modification of logObject
  mapApiResultsToLogObject(resultObj, logObject, retval);
  activityLogUtil.printActivityLogString(logObject, 'api');
}

/**
 * Combines input obj with values from the request object
 * then logs
 * @param {Object} req - the request object
 * @param {Object} resultObj - Object with the rest of the fields to print
 * @param {Object or Array} retval - the returned object
 */
function logAPI(req, resultObj, retval) {
  if (req && featureToggles.isFeatureEnabled('enableApiActivityLogs')) {
    // create api activity log object
    const logObject = {
      ipAddress: activityLogUtil.getIPAddrFromReq(req),
      requestBytes: getSize(req.body),
      uri: req.url,
      method: req.method,
    };

    // if API token enabled,
    // extract user, token to update log object
    jwtUtil.getTokenDetailsFromRequest(req)
    .then((resObj) => {
      logObject.user = resObj.username;
      logObject.token = resObj.tokenname;

      // log with the token
      combineAndLog(resultObj, logObject, retval);
    })
    .catch(() => combineAndLog(resultObj, logObject, retval));
  }
}

module.exports = {
  mapApiResultsToLogObject,
  logAPI,
}; // exports
