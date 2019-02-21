/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /realtime/pubSubStats.js
 */
const activityLogType = 'pubsub';
const pubsubStatsKeys = require('./constants').pubsubStatsKeys;
const activityLog = require('../utils/activityLog');
const prototype = require('../config/activityLog')[activityLogType];

function logPubSubStats(processName) {
  console.log('entered logPubSubStats', processName)
  const logObjects = [];
  const pubCount = global[pubsubStatsKeys.pub.count] || {};
  const pubTime = global[pubsubStatsKeys.pub.time] || {};
  const subCount = global[pubsubStatsKeys.sub.count] || {};
  const subTime = global[pubsubStatsKeys.sub.time] || {};
  const keyArray = []
    .concat(Object.keys(pubCount))
    .concat(Object.keys(pubTime))
    .concat(Object.keys(subCount))
    .concat(Object.keys(subTime));
  const keys = [...new Set(keyArray)];
  keys.forEach((key) => {
    const logObj = JSON.parse(JSON.stringify(prototype));
    logObj.process = processName;
    logObj.key = key;
    logObj.pubCount = global.hasOwnProperty(pubsubStatsKeys.pub.count) ?
      (global[pubsubStatsKeys.pub.count][key] || 0) : 0;
    logObj.pubTime = global.hasOwnProperty(pubsubStatsKeys.pub.time) ?
      (global[pubsubStatsKeys.pub.time][key] || 0) : 0;
    logObj.subCount = global.hasOwnProperty(pubsubStatsKeys.sub.count) ?
      (global[pubsubStatsKeys.sub.count][key] || 0) : 0;
    logObj.subTime = global.hasOwnProperty(pubsubStatsKeys.sub.time) ?
      (global[pubsubStatsKeys.sub.time][key] || 0) : 0;
    logObjects.push(logObj);
  });
  delete global[pubsubStatsKeys.pub.count];
  delete global[pubsubStatsKeys.pub.time];
  delete global[pubsubStatsKeys.sub.count];
  delete global[pubsubStatsKeys.sub.time];
  logObjects.forEach((logObj) => {
    activityLog.printActivityLogString(logObj, activityLogType);
  });
} // logPubSubStats

module.exports = logPubSubStats;
