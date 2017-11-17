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
const jwtUtil = require('../utils/jwtUtil');
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
 * @param {Integer} [recordCountOverride] - override the
 * default recordCount. optional
 */
function mapApiResultsToLogObject(resultObj, logObject, retval,
  recordCountOverride) {
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

    // custom recordCount takes precedence
    if (recordCountOverride) {
      recordCount = recordCountOverride;
    } else if (Array.isArray(retval)) {
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
 * @param {Integer} [recordCountOverride] - override the
 * default recordCount. optional
 */
function combineAndLog(resultObj, logObject, retval, recordCountOverride) {
  // in-place modification of logObject
  mapApiResultsToLogObject(resultObj, logObject, retval, recordCountOverride);
  activityLogUtil.printActivityLogString(logObject, 'api');
}

/**
 * Combines input obj with values from the request object
 * then logs
 * @param {Object} req - the request object
 * @param {Object} resultObj - Object with the rest of the fields to print
 * @param {Object or Array} retval - the returned object
 * @param {Integer} recordCountOverride - override the
 * default recordCount. optional
 */
function logAPI(req, resultObj, retval, recordCountOverride) {
  if (req && featureToggles.isFeatureEnabled('enableApiActivityLogs')) {
    const obj = retval.get ? retval.get({ plain: true }) : retval;

    // create api activity log object
    const logObject = {
      ipAddress: activityLogUtil.getIPAddrFromReq(req),
      requestBytes: getSize(req.body),
      uri: req.url,
      method: req.method,
    };

    // Add "request_id" if header is set by heroku.
    if (req.headers && req.headers['x-request-id']) {
      logObject.request_id = req.headers['x-request-id'];
    }

    /**
     * we already set UserName and TokenName in req headers when verifying
     * token
     */
    logObject.user = req.headers.UserName;
    logObject.token = req.headers.TokenName;

    combineAndLog(resultObj, logObject, obj, recordCountOverride);
  }
}

module.exports = {
  mapApiResultsToLogObject,
  logAPI,
}; // exports
