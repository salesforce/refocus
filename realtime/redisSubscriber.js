/**
 * ./realTime/redisSubscriber.js
 */

'use strict'; // eslint-disable-line strict
const emitter= require('./socketIOEmitter');

/**
 *
 * Redis subscriber uses socket.io to broadcast.
 *
 * @param {Socket.io} io - Socket.io's Server API
 * @param {Object} sub - Redis subscriber instance
*/
module.exports = (io, sub) => {
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
