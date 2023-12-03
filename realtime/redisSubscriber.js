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
const logger = require('@salesforce/refocus-logging-client');
const featureToggles = require('feature-toggles');
const emitter = require('./socketIOEmitter');
const { client } = require('../cache/redisCache');
const subPerspectives = client.subPerspectives;
const subBot = client.subBot;
const rtUtils = require('./utils');
const pubSubStats = require('./pubSubStats');
const ZERO = 0;
const ONE = 1;

/**
 * Redis subscriber uses socket.io to broadcast messages to Perspectives and
 * Bots.
 *
 * @param {Socket.io} io - Socket.io's Server API
 * @param {String} processName - Process name
 */
module.exports = async (io) => {
  try {
    // Wait for all promises to be resolved
    const [resolvedSubPerspectives, resolvedSubBot] = await Promise.all([subPerspectives, subBot]);

    const allSubscribers = resolvedSubBot ? resolvedSubPerspectives.concat(resolvedSubBot) : resolvedSubPerspectives;

    // console.log('After Promise.all, allSubscribers:', allSubscribers);
    // const allSubscribers = await Promise.all(subscribersInfo);
    // console.log('\n\n allSubscribers ==>>>>>', allSubscribers);
    if (!allSubscribers || !allSubscribers.length) {
      console.error('All subscribers is undefined or empty');
      return;
    }
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
            logger.error(err);
          }
        }
        /*
         * pass on the message received through the redis subscriber to the socket
         * io emitter to send data to the browser clients.
         */
        emitter(io, key, parsedObj, pubOpts);
      });
    });
  } catch (error){
    // Handle errors if any of the promises reject
    console.error('Error while waiting for subscribers:', error);
  }

};
