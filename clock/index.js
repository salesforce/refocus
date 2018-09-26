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
 * Defines all the scheduled processes to execute on regular intervals.
 *
 * If a separate clock dyno is enabled ("enableClockProcess"), this is the main
 * module to start the clock process. To just start the clock process,
 * use "npm run start-clock". To start both the web and the clock processes
 * locally, use "heroku local".
 *
 * If a separate clock dyno is NOT enabled, this module is just loaded from
 * inside the main web process.
 *
 * To define a new clock job: create a new job file in clock/jobs, update the clockJobConfig object in config.js.
 */
const conf = require('../config');
if (conf.newRelicKey) require('newrelic');
const logEnvVars = require('../utils/logEnvVars');
logEnvVars.log(process.env); // eslint-disable-line no-process-env
const requireDir = require('require-dir');
const setupIntervals = require('./setupIntervals');

const jobs = requireDir('./scheduledJobs');
module.exports = setupIntervals(jobs, conf.clockJobConfig);
