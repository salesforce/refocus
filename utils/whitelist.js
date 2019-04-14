/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * utils/whitelist.js
 */
const request = require('superagent');
const ipWhitelistApplication = process.env.IP_WHITELIST_APPLICATION;
const path = 'v1/verify';

module.exports = (req, res, next) => {
  let ipAddr = '';
  if (req.headers && req.headers['x-forwarded-for']) {
    ipAddr = req.headers['x-forwarded-for'];
  } else if (req.connection && req.connection.remoteAddress) {
    ipAddr = req.connection.remoteAddress;
  }

  request.get(`${ipWhitelistApplication}/${path}/${ipAddr}`)
    .then((_res) => {
      if (_res.status === 200 && _res.body.allow === true) {
        return next();
      };

      const err = new Error('Access denied');
      err.name = 'Unauthorized';
      err.explanation = 'Unauthorized';
      err.status = 401;
      return next(err);
    })
    .catch(next);
};
