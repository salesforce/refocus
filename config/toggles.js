/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /config/toggles.js
 *
 * Configure feature toggles.
 *
 * Usage: wherever you need to check whether a feature is enabled, just
 * add require('feature-toggles') to the top of the module then use
 * featureToggles.isFeatureEnabled('MY_FEATURE_NAME') or
 * featureToggles.isFeatureEnabled('MY_FEATURE_NAME', 'myarg', 'anotherarg').
 * (All the args after the feature name are passed to the function if the
 * feature is defined using a function.)
 */
'use strict'; // eslint-disable-line strict
const featureToggles = require('feature-toggles');
const pe = process.env; // eslint-disable-line no-process-env

/**
 * Return boolean true if the named environment variable is boolean true or
 * case-insensitive string 'true'.
 *
 * @param {Object} processEnv - The node process environment. (Passing it into
 *  this function instead of just getting a reference to it *inside* this
 *  function makes the function easier to test.)
 * @param {String} environmentVariableName - The name of the environment var.
 * @returns {Boolean} true if the named environment variable is boolean true or
 *  case-insensitive string 'true'.
 */
function environmentVariableTrue(processEnv, environmentVariableName) {
  const x = processEnv[environmentVariableName];
  return typeof x !== 'undefined' && x !== null &&
    x.toString().toLowerCase() === 'true';
} // environmentVariableTrue

/*
 * Add a new feature flag by adding an attribute here.
 */
const toggles = {
  // Disable HTTP, i.e. only use https
  disableHttp: environmentVariableTrue(pe, 'DISABLE_HTTP'),

  // Enable caching for GET /v1/perspectives/{key}?
  enableCachePerspective: environmentVariableTrue(pe,
    'ENABLE_CACHE_PERSPECTIVE'),

  // Enable heroku clock dyno
  enableClockDyno: environmentVariableTrue(pe, 'HEROKU_CLOCK_DYNO'),

  // Enable GET /v1/subjects?tags=...
  filterSubjByTags: environmentVariableTrue(pe, 'FILTER_SUBJ_BY_TAGS'),

  // Enable bulk upsert optimization
  optimizeUpsert: environmentVariableTrue(pe, 'OPTIMIZE_UPSERT'),
};

featureToggles.load(toggles);

module.exports = {
  environmentVariableTrue, // exporting to make it easy to test
};
