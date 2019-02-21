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
const globalKey = require('./constants').pubSubStatsAggregator;
const activityLog = require('../utils/activityLog');
const logLinePrototype = require('../config/activityLog')[activityLogType];

const errorMessage = {
  src: 'pubSubStats.track error: src must be "pub" or "sub"',
  evt: 'pubSubStats.track error: evt must be non-empty string',
  obj: 'pubSubStats.track error: obj must be a non-array object',
};

/**
 * Used by publishers and subscribers to track the pubsub stats by event type
 * and process. These stats are stored and updated in memory in a global
 * variable by each publisher (i.e. every node process running on each web dyno
 * and every worker dyno) and by each subscriber (i.e. every node process
 * running on each web dyno).
 *
 * Note: we tried storing in redis first, rather than a global variable within
 * the node process, but that redis instance became a bottleneck which caused
 * performance issues so here we are using "global".
 *
 * @param {String} src - "pub" or "sub"
 * @param {String} evt - the real-time event type
 * @param {Object} obj - the event payload
 * @throws {Error} if invalid args
 */
function track(src, evt, obj) {
  const now = Date.now();

  // Validate args
  if (!['pub', 'sub'].includes(src)) {
    throw new Error(errorMessage.src);
  }

  if (!evt || typeof evt !== 'string' || evt.length === 0) {
    throw new Error(errorMessage.evt);
  }

  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error(errorMessage.obj);
  }

  /*
   * Calculate the elapsed time. If we can't find an "updatedAt" attribute,
   * treat the elapsed time as 0 but console.trace the object.
   */
  let elapsed = 0;
  if (obj.hasOwnProperty('updatedAt')) {
    elapsed = now - new Date(obj.updatedAt);
  } else if (obj.hasOwnProperty('new') && obj.new.hasOwnProperty('updatedAt')) {
    elapsed = now - new Date(obj.new.updatedAt);
  } else {
    console.trace('Where is updatedAt? ' + JSON.stringify(obj));
  }

  // Initialize the global variable if necessary
  if (!global.hasOwnProperty(globalKey)) {
    global[globalKey] = {};
  }

  /*
   * Initialize a new attribute in the global variable for this event type, if
   * necessary.
   */
  if (!global[globalKey].hasOwnProperty(evt)) {
    global[globalKey][evt] = {
      pubCount: 0,
      pubTime: 0,
      subCount: 0,
      subTime: 0,
    };
  }

  // Increment the count and elapsed time for this event.
  if (src === 'pub') {
    global[globalKey][evt].pubCount++;
    global[globalKey][evt].pubTime += elapsed;
  } else if (src === 'sub') {
    global[globalKey][evt].subCount++;
    global[globalKey][evt].subTime += elapsed;
  }
} // track

/**
 * Returns an array of pubsub stats objects to get logged and resets the global
 * pubSubStatsAggregator.
 *
 * @param {String} processName - the process name, e.g. web.1:3, worker.2, ...
 * @returns {Array<Object>} objects to get logged
 */
function prepareLogLines(processName) {
  // Short-circuit return empty array if there is nothing to log
  if (!global.hasOwnProperty(globalKey) ||
    Object.keys(global[globalKey]).length === 0) {
    return [];
  }

  // Copy and reset the tracked stats
  const eventStats = JSON.parse(JSON.stringify(global[globalKey]));
  delete global[globalKey];

  // Prepare and return a log line for each event type
  return Object.keys(eventStats).map((evt) => {
    const l = JSON.parse(JSON.stringify(logLinePrototype));
    l.process = processName;
    l.key = evt;
    return Object.assign(l, eventStats[evt]);
  });
} // prepareLogLines

/**
 * Writes out the pub-sub statistics for each event type and reset the global
 * pubSubStatsAggregator.
 *
 * @param {String} processName - the process name, e.g. web.1:3, worker.2, ...
 */
function log(processName) {
  // Write a log line for each event type
  prepareLogLines(processName).forEach((obj) => {
    activityLog.printActivityLogString(obj, activityLogType);
  });
} // log

module.exports = {
  log,
  prepareLogLines, // export for testing only
  track,
};
