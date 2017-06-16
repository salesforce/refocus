/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * clock/scheduledJobs/kueStatsActivityLogs.js
 *
 * Kue stats activity logging.
 */
const key = 'kueStats';
const k = require('../../config/activityLog').activityType[key];
const warningThreshold = require('../../config').kueStatsInactiveWarning;
const activityLogUtil = require('../../utils/activityLog');
const jobQueue = require('../../jobQueue/setup').jobQueue;
const DEFAULT_LOG_LEVEL = 'info';
const WARNING_LOG_LEVEL = 'warn';
const ZERO = 0;

/**
 * Generate the logging object. (Separating this out and exporting for easier
 * testing.)
 *
 * @returns {Object} logging object
 */
function generateLogObject() {
  return new Promise((resolve, reject) => {
    const obj = JSON.parse(JSON.stringify(k));
    const promises = [
      new Promise((resolve, reject) => {
        jobQueue.activeCount((err, n) => resolve(n || 0));
      }),
      new Promise((resolve, reject) => {
        jobQueue.completeCount((err, n) => resolve(n || 0));
      }),
      new Promise((resolve, reject) => {
        jobQueue.failedCount((err, n) => resolve(n || 0));
      }),
      new Promise((resolve, reject) => {
        jobQueue.inactiveCount((err, n) => resolve(n || 0));
      }),
      new Promise((resolve, reject) => {
        jobQueue.workTime((err, ms) => resolve(ms || 0));
      }),
    ];
    Promise.all(promises)
    .then((res) => {
      obj.activeCount = res[0];
      obj.completeCount = res[1];
      obj.failedCount = res[2];
      obj.inactiveCount = res[3];
      obj.workTimeMillis = res[4];
      resolve(obj);
    });
  });
} // generateLogObject

/**
 * Execute the call to write kue stats activity logs.
 */
function execute() {
  generateLogObject()
  .then((obj) => {
    let level = DEFAULT_LOG_LEVEL;
    if (warningThreshold > ZERO && obj.inactiveCount > warningThreshold) {
      level = WARNING_LOG_LEVEL;
    }

    activityLogUtil.printActivityLogString(obj, key, level);
  });
} // execute

module.exports = {
  execute,
  generateLogObject, // exporting this to make it easier to test
};
