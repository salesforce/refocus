/**
 * Copyright (c) 2017, salesforce.com, inc.
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
const logInvalidHmsetValues = require('../../utils/common').logInvalidHmsetValues;
const activityLogUtil = require('../../utils/activityLog');
const queueTime95thMillis = require('../../config').queueTime95thMillis;
const redis = require('../../cache/redisCache');
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const FLOAT_TWO = 2.0;
const PERCENTILE_95TH = 0.95;

// Redis connection
const client = redis.client.realtimeLogging;

/**
 * Convert array to string
 *
 * @param {array} array - array of integers
 * @returns {string} string - string of array
 */
function arrayToString(array) {
  return array.join(',');
}

/**
 * Convert string to array
 *
 * @param {string} string - string of array
 * @returns {array} array - array of integers
 */
function stringToArray(string) {
  if (string.length) {
    const array = string.split(',');
    for (let i = 0; i < array.length; i++) {
      if (!isNaN(array[i])) {
        array[i] = Number(array[i]);
      }
    }

    return array;
  }

  return [];
}

/**
 * Convert string to Array then add element and again conver
 * to string
 *
 * @param {string} string - string of array
 * @param {integer} qt - queueTime
 * @returns {string} string - string of array
 */
function addToArray(string, qt) {
  const array = stringToArray(string);
  array.push(qt);
  return arrayToString(array);
}

/**
 * Calculate timestamp i.e 2017.04.11.15.58.
 *
 * @returns {string} timestamp - timestamp string
 */
function createTimeStamp() {
  const date = new Date();
  return date.getUTCFullYear() + '.' + (date.getUTCMonth() + ONE) + '.' +
    date.getUTCDate() + '.' + date.getUTCHours() + '.' + date.getUTCMinutes();
}

/**
 * Calculate Statistics based on queue timing array.
 *
 * @param {array} qt - array of queue timings
 * @returns {object} stats - statistics based on queue timing array
 *     i.e median, average and 95th Percentile
 */
function calculateStats(qt) {
  let median = 0;
  let average = 0;
  let percentile95th = 0;
  const stats = {};
  const length = qt.length;

  // sort the queue time array
  qt.sort((a, b) => a - b);

  // calculate sum of queue time
  const sum = qt.reduce((a, b) => a + b, ZERO);

  // calculate middle of array
  const middle = Math.floor(length / TWO);
  average = sum / length;

  // calculate median
  if (length % TWO) {
    median = qt[middle];
  } else {
    median = (qt[middle - ONE] + qt[middle]) / FLOAT_TWO;
  }

  // calculate 95th Percentile
  const index = Math.round(PERCENTILE_95TH * length);
  percentile95th = qt[index - ONE];

  // construct stats object
  stats.averageQueueTimeMillis = average.toFixed(TWO);
  stats.medianQueueTimeMillis = median.toFixed(TWO);
  stats.queueTime95thMillis = percentile95th;

  return stats;
}

/**
 * Construct log object
 *
 * @param {object} qStats - queue time object from redis
 * @returns {object} queueStats - queue time stats log object
 */
function constructLogObject(qStats) {
  const queueStats = {};

  queueStats.jobCount = qStats.jobCount;
  queueStats.recordCount = qStats.recordCount;
  const queueTimeArray = stringToArray(qStats.queueTimeArray);
  queueStats.timestamp = qStats.timestamp;

  // Calculate stats based on queue timings
  const stats = calculateStats(queueTimeArray);

  queueStats.medianQueueTimeMillis = stats.medianQueueTimeMillis;
  queueStats.averageQueueTimeMillis = stats.averageQueueTimeMillis;
  queueStats.queueTime95thMillis = stats.queueTime95thMillis;

  return queueStats;
}

/**
 * Update recordCount, jobCount and push queue time when
 * job is done.
 *
 * @param {integer} rc - record count for individual job
 * @param {integer} qt - queue time for individual job
 */
function update(rc, qt) {
  const _timestamp = createTimeStamp();
  const key = 'queueStats.' + _timestamp;
  const mainKey = 'queueStats';
  let obj;

  // get main key that containes array of timestamp keys
  client.hgetallAsync(key).then((reply) => {
    if (reply) {
      obj = {
        jobCount: Number(reply.jobCount) + ONE,
        recordCount: Number(reply.recordCount) + rc,
        queueTimeArray: addToArray(reply.queueTimeArray, qt),
      };
      logInvalidHmsetValues(key, obj);
      client.hmset(key, obj);
    } else {
      obj = {
        jobCount: ONE,
        recordCount: rc,
        queueTimeArray: addToArray('', qt),
        timestamp: _timestamp,
      };
      logInvalidHmsetValues(key, obj);
      client.hmset(key, obj);

      client.hgetallAsync(mainKey).then((_reply) => {
        const hmsetObj = {
          keyArray: addToArray(_reply ? _reply.keyArray : '', key),
        };
        logInvalidHmsetValues(mainKey, hmsetObj);
        client.hmset(mainKey, hmsetObj);
      });
    }
  })
  .catch((err) => {
    throw new Error(err);
  });
}

/**
 * Execute the call to write queue stats activity logs.
 */
function execute() {
  // Get queueStats from redis
  let keyArray;
  const mainKey = 'queueStats';
  client.hgetallAsync(mainKey).then((reply) => {
    const currentTimeStamp = 'queueStats.' + createTimeStamp();
    if (reply) {
      const keys = stringToArray(reply.keyArray);
      for (let i = 0; i < keys.length; i++) {
        if (currentTimeStamp !== keys[i]) {
          // Get data based on key from redis
          client.hgetallAsync(keys[i]).then((data) => {
            if (data) {
              // Construct log object
              const queueStats = constructLogObject(data);

              // If 95th Percentile time is higher then limit then
              // print warn log else info log
              if (queueTime95thMillis &&
                queueStats.queueTime95thMillis > queueTime95thMillis) {
                activityLogUtil
                  .printActivityLogString(queueStats, 'queueStats', 'warn');
              } else {
                activityLogUtil
                  .printActivityLogString(queueStats, 'queueStats', 'info');
              }

              // Delete key once logs is printed
              client.del(keys[i]);
            }
          })
          .catch((err) => {
            throw new Error(err);
          });
        } else {
          // reset key value to contain only current timestamp key
          keyArray = currentTimeStamp;
        }
      }

      const hmsetObj = {
        keyArray: addToArray('', keyArray),
      };
      logInvalidHmsetValues(mainKey, hmsetObj);
      client.hmset(mainKey, hmsetObj);
    }
  })
  .catch((_err) => {
    throw new Error(_err);
  });
} // execute

module.exports = {
  addToArray,
  arrayToString,
  calculateStats,
  constructLogObject,
  createTimeStamp,
  execute,
  stringToArray,
  update,
};
