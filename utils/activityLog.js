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
const logger = new (winston.Logger)({
  transports: [new (winston.transports.Console)()],
});

module.exports = {

  /**
   * Get IP Address from request.
   * @param  {Object} req - Request object
   * @returns {String} - IP Address
   */
  getIPAddrFromReq(req) {
    let ipAddr = null;
    if (req) {
      if (req.headers && req.headers['x-forwarded-for']) {
        ipAddr = req.headers['x-forwarded-for'];
      } else if (req.connection && req.connection.remoteAddress) {
        ipAddr = req.connection.remoteAddress;
      }
    }

    return ipAddr;
  },

  /**
   * Convert activity log object to String format and print.
   *
   * @param  {Object} logObject - Log Object
   * @param  {string} logtype - @see /config/activityLog.js
   * @param  {string} logLevel - Log Level info, warn, error
   *  verbose, debug, silly. Default log info.
   */
  printActivityLogString(logObject, logtype, logLevel='info') {
    // example: activity=worker user="igoldstein@salesforce.com" token="Eleven"
    // ipAddress="123.456.789.012" totalTime=123ms jobType=bulkUpsertSamples
    // queueTime=3ms workTime=487ms dbTime=413ms recordCount=2254 errorCount=1
    const logParams = activityLogParams[logtype];
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
    logger.log(logLevel, logStr);
  },

  /**
   * Update the result object parameters calculated from job object params.
   * @param  {Object} resultObj - Result object to be returned after
   *  processing job
   * @param  {Object} tempObj - Object passed for calculating result object
   */
  updateActivityLogParams(resultObj, tempObj) {
    if (tempObj.dbEndTime) {
      if (tempObj.dbStartTime) {
        /* aggregate sequelize time, not necessarily continuous, e.g. the worker
        can make multiple sequelize calls--this should measure the sum of all
        the time spent in sequelize calls */
        resultObj.dbTime = tempObj.dbEndTime - tempObj.dbStartTime;
      }
    }

    if (tempObj.jobEndTime) {
      // jobEndTime, when job is finished and ready to be sent back
      resultObj.jobEndTime = tempObj.jobEndTime;

      if (tempObj.jobStartTime) {
        // time spent from when the job is pulled off the queue to completion
        resultObj.workTime = tempObj.jobEndTime - tempObj.jobStartTime;
      }
    }

    if (tempObj.reqStartTime) {
      // reqStartTime, when job request was placed
      resultObj.reqStartTime = tempObj.reqStartTime;

      if (tempObj.jobStartTime) {
        // queueTime, time spent in the queue
        resultObj.queueTime = tempObj.jobStartTime - tempObj.reqStartTime;
      }
    }
  },

  logger,
};
