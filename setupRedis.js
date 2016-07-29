/**
 * ./setupRedis.js
 * Redis subscriber uses socket.io to broadcast.
 *
 * @param {Socket.io} io - Socket.io's Server API
 * @param {Object} sub - Redis subscriber instance
*/

module.exports = (io, sub) => {
  sub.on('message', (channel, mssgStr) => {

    // TODO: would regex be faster than JSON.parse to extract the key and
    // object?
    const mssgObj = JSON.parse(mssgStr);
    const key = Object.keys(mssgObj)[0];

    io.sockets.emit(key, JSON.stringify(mssgObj));
  });
};
