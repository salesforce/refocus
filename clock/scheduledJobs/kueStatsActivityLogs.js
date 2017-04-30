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
 * Execute the call to write kue stats activity logs.
 */
function execute() {
  const obj = JSON.parse(JSON.stringify(k));
  jobQueue.card('active', (err, n) => {
    if (!err) {
      obj.activeCount = n;
    }
  });
  jobQueue.card('complete', (err, n) => {
    if (!err) {
      obj.completeCount = n;
    }
  });
  jobQueue.card('failed', (err, n) => {
    if (!err) {
      obj.failedCount = n;
    }
  });
  jobQueue.card('inactive', (err, n) => {
    if (!err) {
      obj.inactiveCount = n;
    }
  });
  jobQueue.workTime((err, ms) => {
    if (!err) {
      obj.workTimeMillis = ms;
    }
  });
  let level = DEFAULT_LOG_LEVEL;
  if (warningThreshold > ZERO && obj.inactiveCount > warningThreshold) {
    level = WARNING_LOG_LEVEL;
  }

  activityLogUtil.printActivityLogString(obj, key, level);
} // execute

module.exports = {
  execute,
};
