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
 */
'use strict'; // eslint-disable-line strict
const featureToggles = require('feature-toggles');
const pe = process.env; // eslint-disable-line no-process-env
const nodeEnv = pe.NODE_ENV || 'development';
console.log('nodeEnv='+nodeEnv)

/**
 * Return boolean true if the named environment variable is boolean true or
 * case-insensitive string 'true'.
 *
 * @param {String} environmentVariableName - The name of the environment var.
 * @returns {Boolean} true if the named environment variable is boolean true or
 *  case-insensitive string 'true'.
 */
function environmentVariableTrue(environmentVariableName) {
  const x = pe[environmentVariableName];
  return typeof x !== 'undefined' && x !== null &&
    x.toString().toLowerCase() === 'true';
} // environmentVariableTrue

const toggles = {
  // Enable caching for GET /v1/perspectives/{key}?
  enableCachePerspective: environmentVariableTrue('ENABLE_CACHE_PERSPECTIVE'),

  // Enable heroku clock dyno
  enableClockDyno: environmentVariableTrue('HEROKU_CLOCK_DYNO'),

  // Enable GET /v1/subjects?tags=...
  filterSubjByTags: environmentVariableTrue('FILTER_SUBJ_BY_TAGS'),

  // Enable bulk upsert optimization
  optimizeUpsert: environmentVariableTrue('OPTIMIZE_UPSERT'),
};

featureToggles.load(toggles);
