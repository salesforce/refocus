/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * utils/activityLog.js
 */

'use strict'; // eslint-disable-line strict
const activityLogParams = require('../config/activityLog');
const winston = require('winston');

module.exports = {

  /**
   * Get IP Address from request.
   * @param  {Object} req - Request object
   * @returns {String} - IP Address
   */
  getIPAddrFromReq(req) {
    let ipAddr = null;
    if (req) {
      if (req.connection && req.connection.remoteAddress) {
        ipAddr = req.connection.remoteAddress;
      } else if (req.headers && req.headers['x-forwarded-for']) {
        ipAddr = req.headers['x-forwarded-for'];
      }
    }

    return ipAddr;
  },

  /**
   * Convert activity log object to String format and print.
   * @param  {Object} logObject - Log Object
   * @param  {string} logtype - worker, api or realtime
   */
  printActivityLogString(logObject, logtype) {
    // example: activity=worker user="igoldstein@salesforce.com" token="Eleven"
    // ipAddress="123.456.789.012" totalTime=123ms jobType=bulkUpsertSamples
    // queueTime=3ms workTime=487ms dbTime=413ms recordCount=2254 errorCount=1
    const logParams = activityLogParams.activityType[logtype];
    let logStr = '';

    for (const param in logParams) {
      if (logParams.hasOwnProperty(param)) {
        logStr += `${param}=`;

        // if logObject has this param set, append the value
        if (logObject[param]) {
          logStr += `${logObject[param]} `;
        } else {
          // append default value defined in config
          logStr += `${logParams[param]} `;
        }
      }
    }

    // print the log
    winston.log('info', logStr);
  },
};
