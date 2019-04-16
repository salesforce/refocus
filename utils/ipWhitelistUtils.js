/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * utils/ipWhitelistUtils.js
 *
 * Uses the refocus-whitelist service defined in `conf.ipWhitelistService`
 * (which is based on env var `IP_WHITELIST_SERVICE`).
 *
 * Rejects multiple IP addresses as unauthorized.
 */
const request = require('superagent');
const conf = require('../config');
const path = 'v1/verify';

const unauthorizedErr = new Error('Access denied');
unauthorizedErr.name = 'Unauthorized';
unauthorizedErr.explanation = 'Unauthorized';
unauthorizedErr.status = 401;

/**
 * Resolves to true if the `addr` arg is a valid and whitelisted IP address.
 *
 * @param {String} addr - the IP address to test
 * @returns {Promise<Boolean>} true if the `addr` arg is a valid and
 *  whitelisted IP address
 */
function isWhitelisted(addr) {
  return request.get(`${conf.ipWhitelistService}/${path}/${addr}`)
    .then((_res) => _res.status === 200 && _res.body.allow === true)
    .catch((err) => false);
} // isWhitelisted

module.exports = {
  isWhitelisted,
  middleware: (req, res, next) => isWhitelisted(req.locals.ipAddress)
    .then((allow) => (allow ? next() : next(unauthorizedErr))),
};
