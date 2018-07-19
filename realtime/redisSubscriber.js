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
const rcache = require('../cache/redisCache').client.cache;
const subPerspective = require('../cache/redisCache').client.subPerspective;
const subBot = require('../cache/redisCache').client.subBot;
const featureToggles = require('feature-toggles');
const rtUtils = require('./utils');
const PUB_STATS_HASH = require('./constants').pubStatsHash;
const logger = require('winston');

/**
 * Store pub stats in redis cache, count by key. Note that we're using the
 * async redis command here; we don't require the hincrby command to complete
 * before moving on to other work, so we're not wrapping it in a promise.
 *
 * @param {String} key - The publish key
 */
function trackPublishKey(key) {
  rcache.hincrbyAsync(PUB_STATS_HASH, key, 1);
}

/**
 * Redis subscriber uses socket.io to broadcast.
 *
 * @param {Socket.io} io - Socket.io's Server API
 * @param {Object} sub - Redis subscriber instance
 */
module.exports = (io) => {
  // Broadcast messages to Perspectives and Bots
  [subBot, subPerspective].forEach((s) => {
    s.on('message', (channel, mssgStr) => {
      const mssgObj = JSON.parse(mssgStr);
      const key = Object.keys(mssgObj)[0];
      const parsedObj = rtUtils.parseObject(mssgObj[key], key);
      let { pubOpts } = parsedObj;

      // Deleting pubOpts from parsedObj before passing it to the emitter
      delete parsedObj.pubOpts;

      if (featureToggles.isFeatureEnabled('enablePubStatsLogs')) {
        trackPublishKey(key);
      }

      /*
       * pass on the message received through the redis subscriber to the socket
       * io emitter to send data to the browser clients.
       */
      emitter(io, key, parsedObj, pubOpts);
    });
  });
};
