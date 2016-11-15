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
 * longTermToggles - add a new toggle here if you expect it to be around
 * long-term.
 *
 * Defining a toggle in either "shortTermToggles" or "longTermToggles" has no
 * bearing on how the toggle behaves--it is purely a way for us keep track of
 * our *intention* for a particular feature toggle. It should help us keep
 * things from getting out of hand and keeping tons of dead unused code around.
 */
const longTermToggles = {

  // Disable HTTP, i.e. only use https
  disableHttp: environmentVariableTrue(pe, 'DISABLE_HTTP'),

  // Enable heroku clock dyno
  enableClockDyno: environmentVariableTrue(pe, 'HEROKU_CLOCK_DYNO'),

  /*
   * Use this setting to offload work from web processes to worker processes to
   * achieve better web process throughput and response times.
   */
  useWorkerProcess: environmentVariableTrue(pe, 'USE_WORKER_PROCESS'),

}; // longTermToggles

/*
 * shortTermToggles - add a new toggle here if you expect it to just be a
 * short-term thing, i.e. we'll use it to control rollout of a new feature, but
 * once we're satisfied with the new feature, we'll pull it out and clean up
 * after ourselves.
 *
 * Defining a toggle in either shortTermToggles or longTermToggles has no
 * bearing on how the toggle behaves--it is purely a way for us keep track of
 * our *intention* for a particular feature toggle. It should help us keep
 * things from getting out of hand and keeping tons of dead unused code around.
 */
const shortTermToggles = {

  // Enable caching for GET /v1/perspectives/{key}?
  enableCachePerspective: environmentVariableTrue(pe,
    'ENABLE_CACHE_PERSPECTIVE'),

}; // shortTermToggles

featureToggles.load(Object.assign({}, longTermToggles, shortTermToggles));

module.exports = {
  environmentVariableTrue, // exporting to make it easy to test
};
