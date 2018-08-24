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
const featureToggles = require('feature-toggles');
const config = require('../config');
const activityLog = require('./activityLog');

 /**
  * Note: with node 8, assigning a property on process.env will implicitly
  * convert the value to a string so we do not need to worry about non-string
  * types here.
  */
function truncate(str = '', max) {
  if (!str) return '';
  if (str.length > max) {
    str = str.substring(0, max - 3) + '...';
  }

  return str;
} // truncate

/**
 * Set up the config options, starting from the values from config OR using
 * override values from opts arg.
 *
 * @param {Object} conf - options from config.logEnvVars
 * @param {Object} opts - options object containing optional MASK_LIST and
 *  MAX_LEN attributes
 * @returns {Object} config options
 */
function prepareConfOpts(conf, opts) {
  const retval = {
    maskList: conf.MASK_LIST,
    maxValueLength: conf.MAX_LEN,
  };

  if (opts && opts.MAX_LEN) retval.maxValueLength = opts.MAX_LEN;
  if (retval.maxValueLength < 4) retval.maxValueLength = 512;
  if (opts && opts.MASK_LIST) retval.maskList = opts.MASK_LIST;
  return retval;
} // prepareConfOpts

/**
 * Returns array of 'env' activity log objects, or returns an empty array if
 * env is not an object or is false-y or is an array.
 *
 * @param {Object} env - will be process.env, but exposing it as arg to make it
 *  easier to test (assumes it has typeof "object")
 * @param {Object} opts - will be config.logEnvVars, but exposing it as arg to
 *  make it easier to test
 */
function prepareObjectsToLog(env, opts) {
  /* Short circuit - do nothing if env is false-y or if it's an array. */
  if (!env || Array.isArray(env)) return []; 

  opts = prepareConfOpts(config.logEnvVars, opts);
  return Object.keys(env || {})
  .sort()
  .map((name) => {
    const val = opts.maskList.includes(name) ? 'hidden' :
      truncate(env[name], opts.maxValueLength);
    return {
      name,
      value: `"${val}"`,
    };
  });
} // prepareObjectsToLog

function log(env) {
  if (featureToggles.isFeatureEnabled('enableEnvActivityLogs')) {
    prepareObjectsToLog(env)
    .forEach((obj) => activityLog.printActivityLogString(obj, 'env'));
  }
} // log

module.exports = {
  log,
  prepareConfOpts, // for testing only
  prepareObjectsToLog, // for testing only
  truncate, // for testing only
};
