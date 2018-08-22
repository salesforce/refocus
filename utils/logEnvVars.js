/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./utils/logEnvVars.js
 */
'use strict'; // eslint-disable-line strict
const activityLog = require('./activityLog');
const HIDE_ME_LIST = ['SECRET_TOKEN', 'SESSION_SECRET', 'SECURITYSESSIONID'];
const SKIP_ME_REGEX = /^(HEROKU_|REDIS_BASTION|npm_).*/;

/**
 * Returns array of 'env' activity log objects, or returns an empty array if
 * env is not an object or is false-y or is an array.
 */
function prepareObjectsToLog(env) {
  if (env && Array.isArray(env)) return [];

  return Object.keys(env || {})
  .filter((name) => !name.match(SKIP_ME_REGEX))
  .sort()
  .map((name) => ({
    name,
    value: HIDE_ME_LIST.includes(name) ? '"hidden"' : `"${env[name]}"`,
  }));
} // prepareObjectsToLog

function log(env) {
  prepareObjectsToLog(env)
  .forEach((obj) => activityLog.printActivityLogString(obj, 'env'));
} // log

module.exports = {
  log,
  prepareObjectsToLog, // for testing only
};
