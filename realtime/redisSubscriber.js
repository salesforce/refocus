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
const subPerspective = require('../cache/redisCache').client.subPerspective;
const subBot = require('../cache/redisCache').client.subBot;
const featureToggles = require('feature-toggles');
const rtUtils = require('./utils');
const logger = require('winston');

/**
 * Redis subscriber uses socket.io to broadcast.
 *
 * @param {Socket.io} io - Socket.io's Server API
 * @param {Object} sub - Redis subscriber instance
 */
module.exports = (io) => {
  subPerspective.on('message', (channel, mssgStr) => {
    if (featureToggles.isFeatureEnabled('enableRealtimeActivityLogs')) {
      logger.info('Size of the sample received by the subscriber',
        mssgStr.length);
    }

    // message object to be sent to the clients
    const mssgObj = JSON.parse(mssgStr);
    const key = Object.keys(mssgObj)[0];
    const parsedObj = rtUtils.parseObject(mssgObj[key], key);

    if (featureToggles.isFeatureEnabled('publishPartialSample') &&
    rtUtils.isThisSample(parsedObj)) {
      const useSampleStore =
        featureToggles.isFeatureEnabled('enableRedisSampleStore');

      // assign the subject db model if sampleStore is not enabled
      const subjectModel =
        useSampleStore ? undefined :
          require('../db/index').Subject; // eslint-disable-line global-require
      rtUtils.attachAspectSubject(parsedObj, useSampleStore, subjectModel)
      .then((obj) => {
        /*
         * pass on the message received through the redis subscriber to the
         * socket io emitter to send data to the browser clients.
         */
        emitter(io, key, obj);
      });
    } else {
      /*
       * pass on the message received through the redis subscriber to the socket
       * io emitter to send data to the browser clients.
       */
      emitter(io, key, parsedObj);
    }
  });
  subBot.on('message', (channel, mssgStr) => {
    if (featureToggles.isFeatureEnabled('enableRealtimeActivityLogs')) {
      logger.info('Size of the bot received by the subscriber',
        mssgStr.length);
    }

    // message object to be sent to the clients
    const mssgObj = JSON.parse(mssgStr);
    const key = Object.keys(mssgObj)[0];
    const parsedObj = rtUtils.parseObject(mssgObj[key], key);

    /*
     * pass on the message received through the redis subscriber to the socket
     * io emitter to send data
     */
    emitter(io, key, parsedObj);
  });
};
