/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * utils/whitelistUtils.js
 *
 * Express middleware to verify the origin of the request using the API exposed
 * by the refocus-whitelist service.
 *
 * Rejects multiple IP addresses as unauthorized.
 */
const request = require('superagent');
const ipWhitelistApplication = process.env.IP_WHITELIST_APPLICATION;
const path = 'v1/verify';

function isWhitelisted(addr) {
  request.get(`${ipWhitelistApplication}/${path}/${addr}`)
    .then((_res) => {
      if (_res.status === 200 && _res.body.allow === true) {
        return true;
      };

      const err = new Error('Access denied');
      err.name = 'Unauthorized';
      err.explanation = 'Unauthorized';
      err.status = 401;
      throw err;
    });
} // isWhitelisted

module.exports = {
  isWhitelisted,
  middleware: (req, res, next) => {
    if (!req.locals.ipAddress) {
      const err = new Error('Access denied');
      err.name = 'Unauthorized';
      err.explanation = 'Unauthorized';
      err.status = 401;
      return next(err);
    }

    try {
      isWhitelisted(req.locals.ipAddress);
      next();
    } catch (err) {
      next(err);
    }
  },
};
