/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * utils/activityLogs/workerLog.js
 */
const winston = require('winston');

/**
 * Worker log function which serves as constructor with different fields
 * initialized
 * @param {String} jobType - Type of worker job
 */
function WorkerLog(jobType) {
  this.jobType = jobType;
  this.activity = 'worker'; // default value
  this.user = null;
  this.token = null;
  this.ipAddress = null;
  this.totalTime = null;
  this.queueTime = null;
  this.workTime = null;
  this.dbTime = null;
  this.recordCount = null;
  this.errorCount = null;

  // Function to convert worker log object to String format
  this.toLogString = function toLogString() {
    // example: activity=worker user="igoldstein@salesforce.com" token="Eleven"
    // ipAddress="123.456.789.012" totalTime=123ms jobType=bulkUpsertSamples
    // queueTime=3ms workTime=487ms dbTime=413ms recordCount=2254 errorCount=1
    winston.log('info', `activity=${this.activity} ` +
      `user=${this.user} ` +
      `token=${this.token} ` +
      `ipAddress=${this.ipAddress} ` +
      `totalTime=${this.totalTime}ms ` +
      `jobType=${this.jobType} ` +
      `queueTime=${this.queueTime}ms ` +
      `workTime=${this.workTime}ms ` +
      `dbTime=${this.dbTime}ms ` +
      `recordCount=${this.recordCount} ` +
      `errorCount=${this.errorCount}`);
  };
}

// export the class
module.exports = WorkerLog;
