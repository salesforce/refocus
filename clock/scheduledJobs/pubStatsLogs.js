/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * clock/scheduledJobs/pubStatsLogs.js
 *
 * Activity logging to track the number of real-time events published per key
 * since the last logging interval.
 */
const aType = 'pubStats';
const prototype = require('../../config/activityLog').activityType[aType];
const activityLog = require('../../utils/activityLog');
const PUB_STATS_HASH = require('../../realtime/constants').pubStatsHash;
const redis = require('../../cache/redisCache').client.cache;

/**
 * Generate a pubStats logging object.
 *
 * @param {String} key - The "publish" event key
 * @param {Integer} count - The number of events published to that key since
 *  the last logging interval
 * @returns {Object} a new pubStats logging object
 */
function toLogObj(key, count) {
  const obj = JSON.parse(JSON.stringify(prototype));
  if (typeof key === 'string' && key.length > 0) obj.key = key;
  if (typeof +count === 'number' && count > 0) obj.count = +count;
  return obj;
} // toLogObj

/**
 * Generate the logging objects, one per publish "key". Look up the pubStats
 * hash in redis and "reset" it by deleting it; generate and return an array of
 * pubStats activity type logging objects. 
 *
 * @returns {Array} array of pubStats activity type logging objects
 */
function generateLogObjects() {
  return Promise.all([
    redis.hgetallAsync(PUB_STATS_HASH),
    redis.delAsync(PUB_STATS_HASH),
  ])
  .then((res) => {
    const p = res[0];
    return Object.keys(p).map((key) => toLogObj(key, p[key]));
  });
} // generateLogObjects

/**
 * Generate and write out the pub stats logs (one log entry per publish "key").
 */
function execute() {
  generateLogObjects()
  .then((arr) =>
    arr.forEach((a) => activityLog.printActivityLogString(a, aType)));
} // execute

module.exports = {
  execute,
  generateLogObjects, // export for testing only
  toLogObj, // export for testing only
};
