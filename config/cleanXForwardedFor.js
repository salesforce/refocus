/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./config/cleanXForwardedFor.js
 *
 * "The [heroku] router doesn't overwrite X-Forwarded-For, but it does
 * guarantee that the real origin will always be the last item in the list."
 * - https://stackoverflow.com/questions/18264304/get-clients-real-ip-address-on-heroku
 *
 * When the config toggle "cleanXForwardedForHeader" is true, clean the
 * X-Forwarded-For header by using only the *last* ip address in the
 * comma-separated list of ip addresses.
 *
 * Note: We are doing this *here* rather than passing a custom detectIp
 * function into express-ipfilter because our socket.io handshake *also* uses
 * the x-forwarded-for header.
 */
'use strict'; // eslint-disable-line strict
const FWD = 'x-forwarded-for';

module.exports = (req, res, next) => {
  if (req.headers && req.headers[FWD] && req.headers[FWD].indexOf(',') !== -1) {
    req.headers[FWD] = req.headers[FWD].split(',').pop().trim();
  }

  next();
};
