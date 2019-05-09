/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./cache/api/logApi.js
 *
 * Middleware for logging activity=api log line for cached response
 */
const activityLogConfig = require('../../config/activityLog');
const activityLogUtils = require('../../utils/activityLog');

module.exports = (req, res, next) => {
  const obj = JSON.parse(JSON.stringify(activityLogConfig.api));
  obj.ipAddress = req.locals.ipAddress;
  obj.method = req.method;
  obj.process = req.process;
  if (req.request_id) obj.request_id = req.request_id;
  obj.requestBytes = JSON.stringify(req.body).length;
  obj.token = req.headers.TokenName;
  obj.totalTime = `${Date.now() - req.timestamp}ms`;
  obj.uri = req.url;
  obj.user = req.headers.UserName;

  // What about setting "recordCount" and "responseBytes"? No access to res.body?
  if (res.body) {
    if (Array.isArray(res.body)) {
      obj.recordCount = res.body.length;
    } else {
      obj.recordCount = 1;
    }

    obj.responseBytes = JSON.stringify(res.body).length;
  }

  activityLogUtils.printActivityLogString(obj, 'api');
  next();
};
