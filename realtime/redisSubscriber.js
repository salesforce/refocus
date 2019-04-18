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
const featureToggles = require('feature-toggles');
const emitter = require('./socketIOEmitter');
const subPerspectives = require('../cache/redisCache').client.subPerspectives;
const subBot = require('../cache/redisCache').client.subBot;
const rtUtils = require('./utils');
const pubSubStats = require('./pubSubStats');
const ZERO = 0;
const ONE = 1;
const kafkaConsumer = require('./kafkaConsumer');

function emitViaRedis(io) {
  const allSubscribers = subPerspectives.concat(subBot);
  allSubscribers.forEach((s) => {
    s.on('message', (channel, messageAsString) => {
      const obj = JSON.parse(messageAsString);
      const key = Object.keys(obj)[ZERO];
      const parsedObj = rtUtils.parseObject(obj[key], key);
      const { pubOpts } = parsedObj;

      // Deleting pubOpts from parsedObj before passing it to the emitter
      delete parsedObj.pubOpts;

      if (featureToggles.isFeatureEnabled('enablePubsubStatsLogs')) {
        try {
          pubSubStats.track('sub', key, parsedObj);
        } catch (err) {
          console.error(err);
        }
      }

      /*
       * pass on the message received through the redis subscriber to the socket
       * io emitter to send data to the browser clients.
       */
      emitter(io, key, parsedObj, pubOpts);
    });
  });
} // emitViaRedis

function emitViaKafka(io) {
  kafkaConsumer.subscribe((messageSet, topic, partition) => {
    messageSet.forEach((m) => {
      console.log('KAFKA', topic, partition, m.offset,
        JSON.stringify(m.message.key), JSON.stringify(m.message.value));
    });
  });
} // emitViaKafka

/**
 * Redis subscriber uses socket.io to broadcast messages to Perspectives and
 * Bots.
 *
 * @param {Socket.io} io - Socket.io's Server API
 * @param {String} processName - Process name
 */
module.exports = (io) => {
  if (featureToggles.isFeatureEnabled('useKafkaForPubsub')) {
    emitViaKafka(io);
  } else {
    emitViaRedis(io);
  }
};
