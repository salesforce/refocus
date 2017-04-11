/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * clock/scheduledJobs/queueStatsActivityLogs.js
 *
 * This file is for queue stats activity logs.
 */

const activityLogUtil = require('../../utils/activityLog');
const queueTimeMillis95th = require('../../config').queueTimeMillis95th;
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const FLOAT_TWO = 2.0;
const PERCENTILE_95TH = 0.95;
let jobCount = 0;
let recordCount = 0;
let queueTimeArray = [];
let queueStats = {};

/**
 * Calculate Statistics based on queue timing array.
 *
 * @param {array} qt - array of queue timings
 */
function calculateStats(qt) {
  let median = 0;
  let average = 0;
  let percentile95th = 0;
  const length = qt.length;

  // sort the queue time array
  qt.sort((a, b) => a - b);

  // calculate sum of queue time
  const sum = qt.reduce((a, b) => a + b, ZERO);

  // calculate middle of array
  const middle = Math.floor(length / TWO);
  average = sum / length;

  // calculate median
  if (middle % TWO) {
    median = (qt[middle - ONE] + qt[middle]) / FLOAT_TWO;
  } else {
    median = qt[middle];
  }

  // calculate 95th Percentile
  const index = Math.round(PERCENTILE_95TH * length);
  percentile95th = qt[index - ONE];

  // construct stats object
  queueStats.averageQueueTimeMillis = average.toFixed(TWO);
  queueStats.medianQueueTimeMillis = median.toFixed(TWO);
  queueStats.queueTimeMillis95th = percentile95th;
}

/**
 * Update recordCount, jobCount and push queue time when
 * job is done.
 *
 * @param {integer} rc - record count for individual job
 * @param {integer} qt - queue time for individual job
 */
function update(rc, qt) {
  jobCount += ONE;
  recordCount += rc;
  queueTimeArray.push(qt);
}

/**
 * Execute the call to write queue stats activity logs.
 */
function execute() {
  // calculate queue statistics
  let percentile95th = 0;
  queueStats.jobCount = jobCount;
  queueStats.recordCount = recordCount;
  if (queueTimeArray.length) {
    calculateStats(queueTimeArray);
    percentile95th = queueStats.queueTimeMillis95th;
    queueStats.averageQueueTimeMillis += 'ms';
    queueStats.medianQueueTimeMillis += 'ms';
    queueStats.queueTimeMillis95th += 'ms';
  } else {
    queueStats.averageQueueTimeMillis = '0ms';
    queueStats.medianQueueTimeMillis = '0ms';
    queueStats.queueTimeMillis95th = '0ms';
  }

  // write logs
  if (queueTimeMillis95th &&
    percentile95th > queueTimeMillis95th) {
    activityLogUtil.printActivityLogString(queueStats, 'queueStats', 'warn');
  } else {
    activityLogUtil.printActivityLogString(queueStats, 'queueStats', 'info');
  }

  // initialize again
  queueStats = {};
  jobCount = 0;
  recordCount = 0;
  queueTimeArray = [];
} // execute

module.exports = {
  execute,
  update
};
