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
const sub = require('../cache/redisCache').client.sub;

/**
 * Redis subscriber uses socket.io to broadcast.
 *
 * @param {Socket.io} io - Socket.io's Server API
 * @param {Object} sub - Redis subscriber instance
 */
module.exports = (io) => {
  sub.on('message', (channel, mssgStr) => {
    // message object to be sent to the clients
    const mssgObj = JSON.parse(mssgStr);
    const key = Object.keys(mssgObj)[0];

    /*
     * pass on the message received through the redis subscriber to the socket
     * io emitter to send data to the browser clients.
     */
    emitter(io, key, mssgObj);
  });
};
