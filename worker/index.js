/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /worker/index.js
 *
 * A worker process which uses the "Kue" module to pull
 * jobs off the redis queue.
 *
 * To define a new job: create a new job file in worker/jobs, update the jobType object in
 * config.js.
 */
'use strict'; // eslint-disable-line strict
const featureToggles = require('feature-toggles');
const logger = require('../logger');
const conf = require('../config');
if (conf.newRelicKey) require('newrelic');
const logEnvVars = require('../utils/logEnvVars');
const workerStarted = 'Worker Process Started';
logger.info(workerStarted);
logEnvVars.log(process.env); // eslint-disable-line no-process-env
const { jobConcurrency, clockJobConfig } = conf;
const jobProcessor = require('./jobProcessor');
const requireDir = require('require-dir');
const jobs = requireDir('./jobs');
const clockJobs = requireDir('../clock/scheduledJobs');

jobProcessor.processJobs(jobs, jobConcurrency);
jobProcessor.processClockJobs(clockJobs, clockJobConfig);

if (featureToggles.isFeatureEnabled('enablePubsubStatsLogs')) {
  const logPubSubStats = require('../realtime/pubSubStats').log;
  const processName = process.env.DYNO || 'worker';
  setInterval(() => logPubSubStats(processName),
    conf.pubSubStatsLoggingInterval);
}
