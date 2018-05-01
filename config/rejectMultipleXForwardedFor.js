/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./config/rejectMultipleXForwardedFor.js
 *
 * When the config toggle "rejectMultipleXForwardedFor" is true, reject with
 * status 401 if there are multiple IP address values in the "X-Forwarded-For"
 * header.
 */
'use strict'; // eslint-disable-line strict
const FWD = 'x-forwarded-for';

module.exports = (req, res, next) => {
  if (req.headers && req.headers[FWD] && req.headers[FWD].indexOf(',') !== -1) {
    const err = new Error('Access denied');
    err.name = 'Unauthorized';
    err.explanation = 'Unauthorized';
    err.status = 401;
    next(err);
  }

  next();
};
