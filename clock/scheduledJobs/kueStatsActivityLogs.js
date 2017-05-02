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
  const obj = JSON.parse(JSON.stringify(k));

  jobQueue.activeCount((err, n) => {
    if (!err) {
      obj.activeCount = n;
    }
  });
  jobQueue.completeCount((err, n) => {
    if (!err) {
      obj.completeCount = n;
    }
  });
  jobQueue.failedCount((err, n) => {
    if (!err) {
      obj.failedCount = n;
    }
  });
  jobQueue.inactiveCount((err, n) => {
    if (!err) {
      obj.inactiveCount = n;
    }
  });
  jobQueue.workTime((err, ms) => {
    if (!err) {
      obj.workTimeMillis = ms;
    }
  });
  return obj;
} // generateLogObject

/**
 * Execute the call to write kue stats activity logs.
 */
function execute() {
  const obj = generateLogObject();
  let level = DEFAULT_LOG_LEVEL;
  if (warningThreshold > ZERO && obj.inactiveCount > warningThreshold) {
    level = WARNING_LOG_LEVEL;
  }

  activityLogUtil.printActivityLogString(obj, key, level);
} // execute

module.exports = {
  execute,
  generateLogObject, // exporting this to make it easier to test
};
