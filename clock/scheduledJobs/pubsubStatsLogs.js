/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * clock/scheduledJobs/pubsubStatsLogs.js
 *
 * Activity logging to track the number of real-time events published per key
 * since the last logging interval.
 */
const aType = 'pubsub';
const prototype = require('../../config/activityLog')[aType];
const activityLog = require('../../utils/activityLog');
const pubsubStatsKeys = require('../../realtime/constants').pubsubStatsKeys;
const redis = require('../../cache/redisCache').client.pubsubStats;

/**
 * Generate the logging objects, one per process and event type. Look up the
 * data in redis then "reset" by deleting those redis keys. Generate and return
 * an array of pubsubStats activity type logging objects.
 *
 * @returns {Promise} which resolves to an array of pubsubStats activity type
 *  logging objects
 */
function generateLogObjects() {
  let processes = [];
  let pubCounts = {};
  let pubTimes = {};
  let subData = [];
  const keysToDelete = [
    pubsubStatsKeys.sub.processes,
    pubsubStatsKeys.pub.count,
    pubsubStatsKeys.pub.time,
  ];
  const dataRetrievalPromises = [
    redis.smembersAsync(pubsubStatsKeys.sub.processes),
    redis.hgetallAsync(pubsubStatsKeys.pub.count),
    redis.hgetallAsync(pubsubStatsKeys.pub.time),
  ];
  return Promise.all(dataRetrievalPromises)
    .then((res) => {
      [processes, pubCounts, pubTimes] = res;
      const subDataRetrievalPromises = [];
      processes.forEach((processName) => {
        const sc = `${pubsubStatsKeys.sub.count}:${processName}`;
        const st = `${pubsubStatsKeys.sub.time}:${processName}`;
        subDataRetrievalPromises.push(redis.hgetallAsync(sc));
        subDataRetrievalPromises.push(redis.hgetallAsync(st));
        keysToDelete.push(sc);
        keysToDelete.push(st);
      });
      return Promise.all(subDataRetrievalPromises);
    })
    .then((res) => {
      subData = res;
      return redis.delAsync(keysToDelete);
    })
    .then(() => {
      const arr = [];
      processes.forEach((processName, i) => {
        const subCountKeys = Object.keys(subData[i * 2]);
        subCountKeys.forEach((k) => {
          const logObj = JSON.parse(JSON.stringify(prototype));
          logObj.process = processName;
          logObj.key = k;
          logObj.pubCount = pubCounts[k] || 0;
          logObj.pubTime = pubTimes[k] || 0;
          logObj.subCount = subData[i * 2][k] || 0;
          logObj.subTime = subData[(i * 2) + 1][k] || 0;
          arr.push(logObj);
        });
      });
      return arr;
    });
} // generateLogObjects

/**
 * Generate and write out the pub stats logs (one log entry per publish "key").
 */
function execute() {
  return generateLogObjects()
  .then((arr) =>
    arr.forEach((a) => activityLog.printActivityLogString(a, aType)));
} // execute

module.exports = {
  execute,
  generateLogObjects, // export for testing only
};
