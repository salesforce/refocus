/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * utils/requestSetup.js
 *
 * Custom middleware to add some basic stuff to the request:
 * - ipAddress: based on either the "x-forwarded-for" header or the
 *  connection.remoteAddress
 * - request_id: unique identifier from heroku
 * - timestamp
 */
'use strict'; // eslint-disable-line strict
const XFWD = 'x-forwarded-for';
const XREQID = 'x-request-id';

module.exports = (req, res, next) => {
  // ipAddress
  if (req.headers && req.headers[XFWD]) {
    req.ipAddress = req.headers[XFWD];
  } else if (req.connection && req.connection.remoteAddress) {
    req.ipAddress = req.connection.remoteAddress;
  }

  // request_id
  if (req.headers && req.headers[XREQID]) req.request_id = req.headers[XREQID];

  req.tismestamp = Date.now();
  next();
};
