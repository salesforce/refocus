/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./realTime/redisSubscriber.js
 */
'use strict'; // eslint-disable-line strict
const emitter = require('./socketIOEmitter');
const rcache = require('../cache/redisCache').client.pubsubStats;
const subPerspective = require('../cache/redisCache').client.subPerspective;
const subBot = require('../cache/redisCache').client.subBot;
const featureToggles = require('feature-toggles');
const rtUtils = require('./utils');
const subKeys = require('./constants').pubsubStatsKeys.sub;
const ZERO = 0;
const ONE = 1;

/**
 * Store pub stats in redis cache by process name, tracking count and subscribe
 * time by key. Note that we're using the async redis command here; we don't
 * require the hincrby command to complete before moving on to other work, so
 * we're not wrapping it in a promise.
 *
 * @param {String} processName - The process name
 * @param {String} key - The event type
 * @param {Object} obj - The object being published
 */
function trackStats(processName, key, obj) {
  const elapsed = Date.now() - new Date(obj.updatedAt);
  rcache.saddAsync(`${subKeys.processes}`, processName)
    .catch((err) => {
      console.error('redisSubscriber.trackStats SADD', subKeys.processes,
        processName, err);
    });
  rcache.hincrbyAsync(`${subKeys.count}:${processName}`, key, ONE)
    .catch((err) => {
      console.error('redisSubscriber.trackStats HINCRBY', subKeys.count,
        processName, key, ONE, err);
    });
  rcache.hincrbyAsync(`${subKeys.time}:${processName}`, key, elapsed)
    .catch((err) => {
      console.error('redisSubscriber.trackStats HINCRBY', subKeys.time,
        processName, key, elapsed, err);
    });
} // trackStats

/**
 * Redis subscriber uses socket.io to broadcast messages to Perspectives and
 * Bots.
 *
 * @param {Socket.io} io - Socket.io's Server API
 * @param {String} processName - Process name
 */
module.exports = (io, processName) => {
  [subBot, subPerspective].forEach((s) => {
    s.on('message', (channel, messageAsString) => {
      const obj = JSON.parse(messageAsString);
      const key = Object.keys(obj)[ZERO];
      const parsedObj = rtUtils.parseObject(obj[key], key);
      const { pubOpts } = parsedObj;

      // Deleting pubOpts from parsedObj before passing it to the emitter
      delete parsedObj.pubOpts;

      if (featureToggles.isFeatureEnabled('enablePubsubStatsLogs')) {
        trackStats(processName, key, parsedObj);
      }

      /*
       * pass on the message received through the redis subscriber to the socket
       * io emitter to send data to the browser clients.
       */
      emitter(io, key, parsedObj, pubOpts);
    });
  });
};
