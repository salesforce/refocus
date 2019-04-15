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
 * connection.remoteAddress, and assign it to the request object as
 * req.locals.ipAddress.
 *
 * @param obj
 * @returns {*}
 */
function getIpAddress(obj) {
  if (!obj) return undefined;

  // From request's "x-forwarded-for" header?
  if (obj.headers && obj.headers[XFWD]) {
    return obj.headers[XFWD];
  }

  // From request's connection.remoteAddress?
  if (obj.connection && obj.connection.remoteAddress) {
    return obj.connection.remoteAddress;
  }

  // From socket handshake's "x-forwarded-for" header?
  if (obj.handshake && obj.handshake.headers && obj.handshake.headers[XFWD]) {
    return obj.handshake.headers[XFWD];
  }

  // From socket handshake's address?
  if (obj.handshake.address) {
    return obj.handshake.address;
  }

  return undefined;
};

module.exports = {
  getIpAddress,
  middleware: (req, res, next) => {
    req.locals.ipAddress = getIpAddress(req);
    next();
  },
};
