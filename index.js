/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./index.js
 *
 * Main module to start the web process. To just start the web process use
 * "node index.js". To start both the web and the clock process use "heroku local"
 */

/* eslint-disable global-require */
/* eslint-disable no-process-env */
const throng = require('throng');
const featureToggles = require('feature-toggles');
const DEFAULT_WEB_CONCURRENCY = 1;
const WORKERS = process.env.WEB_CONCURRENCY || DEFAULT_WEB_CONCURRENCY;
const conf = require('./config');
const logEnvVars = require('./utils/logEnvVars');
const initKafkaLoggingProducer = require('./logger').initKafkaLoggingProducer;

/**
 * Entry point for each clustered process.
 *
 * @param {Number} clusterProcessId - process id if called from throng,
 *  otherwise 0
 */
function start(clusterProcessId = 0) { // eslint-disable-line max-statements
  console.log(`Started node process ${clusterProcessId}`);

  /*
   * Express app
   */
  const app = require('./express').app;

  /*
   * Sample store
   */
  require('./cache/sampleStoreInit').init();

  /*
   * Clock jobs
   * If the clock dyno is NOT enabled, schedule all the scheduled jobs right
   * from here.
   */
  if (!featureToggles.isFeatureEnabled('enableClockProcess')) {
    require('./clock/index'); // eslint-disable-line global-require
  }

  /*
   * Logging
   */

  const processName = (process.env.DYNO ? process.env.DYNO + ':' : '') +
    clusterProcessId;

  if (conf.newRelicKey) {
    require('newrelic');
  }

  if (featureToggles.isFeatureEnabled('enablePubsubStatsLogs')) {
    const logPubSubStats = require('./realtime/pubSubStats').log;
    setInterval(() => logPubSubStats(processName),
      conf.pubSubStatsLoggingInterval);
  }

  // Log env vars. Only log once when there are multiple processes.
  // Process id is 0 for a single process, 1-n for multiple throng workers.
  if (clusterProcessId < 2) logEnvVars.log(process.env);

  // Custom middleware to add process info to the request (for use in logging)
  app.use((req, res, next) => {
    // process id (0 for a single process, 1-n for multiple throng workers)
    req.clusterProcessId = clusterProcessId;

    // process name (dyno + process id)
    req.process = processName;

    next();
  });
}

function startMaster() {
  console.log('Started node cluster master');
} // startMaster

function startWithKafkaLogging() {
  initKafkaLoggingProducer().then(() => {
    start();
  });
}

const isProd = (process.env.NODE_ENV === 'production');
if (isProd) {
  throng({
    lifetime: Infinity,
    master: startMaster,
    start: startWithKafkaLogging,
    workers: WORKERS,
  });
} else {
  startWithKafkaLogging();
}
