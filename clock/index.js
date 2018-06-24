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
 */
const conf = require('../config');
if (conf.newRelicKey) {
  require('newrelic');
}

const featureToggles = require('feature-toggles');
const kueStatsActivityLogs = require('./scheduledJobs/kueStatsActivityLogs');
const pubStatsLogs = require('./scheduledJobs/pubStatsLogs');
const persistSampleStoreJob = require('./scheduledJobs/persistSampleStoreJob');
const queueStatsActivityLogs =
  require('./scheduledJobs/queueStatsActivityLogs');
const sampleTimeoutJob = require('./scheduledJobs/sampleTimeoutJob');
const jobCleanup = require('./scheduledJobs/jobCleanup');
const deactivateRooms = require('./scheduledJobs/deactivateRooms');

/*
 * Add all the scheduled work here.
 */
setInterval(sampleTimeoutJob.enqueue, conf.checkTimeoutIntervalMillis);

// If redis sample store feature is enabled, schedule persist to db
if (featureToggles.isFeatureEnabled('enableRedisSampleStore')) {
  setInterval(persistSampleStoreJob.enqueue,
    conf.persistRedisSampleStoreMilliseconds);
}

// If enableKueStatsActivityLogs is true then write log
if (featureToggles.isFeatureEnabled('enableKueStatsActivityLogs')) {
  setInterval(kueStatsActivityLogs.execute,
    conf.queueStatsActivityLogsInterval);
}

// If queueStatsActivityLogs is true then write log
if (featureToggles.isFeatureEnabled('enableQueueStatsActivityLogs')) {
  setInterval(queueStatsActivityLogs.execute,
    conf.queueStatsActivityLogsInterval);
}

// If enablePubStatsLogs is true then write log
if (featureToggles.isFeatureEnabled('enablePubStatsLogs')) {
  setInterval(pubStatsLogs.execute, conf.pubStatsLogsIntervalMillis);
}

if (featureToggles.isFeatureEnabled('autoDeactivateRooms')) {
  setInterval(deactivateRooms.execute, conf.deactivateRoomsInterval);
}

// Clean up completed jobs
setInterval(jobCleanup.enqueue, conf.JOB_REMOVAL_INTERVAL);

// Reset the job id counter
setInterval(jobCleanup.resetCounter, conf.JOB_COUNTER_RESET_INTERVAL);
