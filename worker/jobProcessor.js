/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /worker/jobProcessor.js
 *
 * The jobProcessor is a worker process which uses the "Kue" module to pull
 * jobs off the redis queue.
 *
 * Add a new jobQueue.process(...) block for each new type of job.
 */
'use strict'; // eslint-disable-line strict
const throng = require('throng');
const conf = require('../config');
if (conf.newRelicKey) {
  require('newrelic'); // eslint-disable-line global-require
}

const logger = require('winston');
const jobSetup = require('../jobQueue/setup');
const c = jobSetup.jobConcurrency;
const t = jobSetup.jobType;
const q = require('../jobQueue/jobWrapper').jobQueue;
const bu = require('./jobs/bulkUpsertSamplesJob');
const hi = require('./jobs/getHierarchyJob');
const cl = require('./jobs/jobCleanupJob');
const ti = require('./jobs/sampleTimeoutJob');
const ps = require('./jobs/persistSampleStoreJob');
const au = require('./jobs/createAuditEventsJob');

/**
 * Entry point for each clustered process.
 *
 * @param {Number} clusterProcessId - process id if called from throng,
 *  otherwise 0
 */
function start(clusterProcessId = 0) {
  logger.info(`Worker process ${clusterProcessId} started`);
  q.process(t.BULKUPSERTSAMPLES,        c.BULKUPSERTSAMPLES,        bu);
  q.process(t.GET_HIERARCHY,            c.GET_HIERARCHY,            hi);
  q.process(t.JOB_CLEANUP,              c.JOB_CLEANUP,              cl);
  q.process(t.SAMPLE_TIMEOUT,           c.SAMPLE_TIMEOUT,           ti);
  q.process(t.PERSIST_SAMPLE_STORE,     c.PERSIST_SAMPLE_STORE,     ps);
  q.process(t.BULK_CREATE_AUDIT_EVENTS, c.BULK_CREATE_AUDIT_EVENTS, au);
} // start

function startMaster() {
  console.log('Started node cluster master');
} // startMaster

const isProd = (process.env.NODE_ENV === 'production');
if (isProd) {
  throng({
    lifetime: Infinity,
    master: startMaster,
    start,
    workers: conf.workerProcesses,
  });
} else {
  start();
}
