/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * clock/index.js
 *
 * Main module to start the clock process. To just start the clock process,
 * use "npm run start-clock". To start both the web and the clock process
 * locally, use "heroku local"
 */
const featureToggles = require('feature-toggles');
const conf = require('../config');
const env = conf.environment[conf.nodeEnv];

const dbSample = require('../db/index').Sample;

if (featureToggles.isFeatureEnabled('enableClockDyno')) {
  setInterval(() => dbSample.doTimeout(), env.checkTimeoutIntervalMillis);
}
