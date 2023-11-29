/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * utils/ipAddressUtils.js
 *
 * Express middleware to determine the ip address origin of the request based
 * on either the request's "x-forwarded-for" header or the request's
 * connection.remoteAddress, and assign it to the request object as
 * req.locals.ipAddress.
 *
 * @param  {Object} req - Request object
 * @param  {Object} res - Response object
 * @param  {Function} next - The next function to invoke
 */
const XFWD = 'x-forwarded-for';

/**
 * Determines the ip address origin of the request based on either the
 * request's "x-forwarded-for" header or the request's
 * connection.remoteAddress, and returns the ip address to the caller.
 *
 * @param {request} req - http request object
 * @returns {*} a string representing the ip address or undefined if none was
 *  discernible from the req
 */
function getIpAddressFromRequest(req) {
  if (!req || typeof req !== 'object') {
    return undefined;
  }
  // From request's "x-forwarded-for" header?
  if (req.headers && req.headers[XFWD]) {
    return req.headers[XFWD];
  }

  // From request's connection.remoteAddress?
  if (req.connection && req.connection.remoteAddress) {
    return req.connection.remoteAddress;
  }

  return undefined;
}; // getIpAddressFromRequest

/**
 * Determines the ip address origin of the socket connection based on either
 * the socket handshake's "x-forwarded-for" header or the socket handshake's
 * address, and returns the ip address to the caller.
 *
 * @param {request} req - http request object
 * @returns {*} a string representing the ip address or undefined if none was
 *  discernible from the req
 */
function getIpAddressFromSocket(socket) {
  if (!socket || !socket.handshake) return undefined;

  // From socket handshake's "x-forwarded-for" header?
  if (socket.handshake.headers && socket.handshake.headers[XFWD]) {
    return socket.handshake.headers[XFWD];
  }

  // From socket handshake's address?
  if (socket.handshake.address) {
    return socket.handshake.address;
  }

  return undefined;
}; // getIpAddressFromSocket

module.exports = {
  getIpAddressFromRequest,
  getIpAddressFromSocket,
  middleware: (req, res, next) => {
    console.log('\n\n\n\n\n\n getIpAddressFromRequest connection remoteAddress ==>>>>>>>>>>');
    if (!req.hasOwnProperty('locals')) {
      req.locals = {};
    }

    req.locals.ipAddress = getIpAddressFromRequest(req);
    next();
  },
};
