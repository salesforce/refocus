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
const jobSetup = require('../jobQueue/setup');
const jobConcurrency = jobSetup.jobConcurrency;
const jobType = jobSetup.jobType;
const jobQueue = require('../jobQueue/jobWrapper').jobQueue;
const bulkUpsertSamplesJob = require('./jobs/bulkUpsertSamplesJob');
const sampleTimeoutJob = require('./jobs/sampleTimeoutJob');
const persistSampleStoreJob = require('./jobs/persistSampleStoreJob');
const workerStarted = 'Worker Process Started';
console.log(workerStarted); // eslint-disable-line no-console

jobQueue.process(jobType.BULKUPSERTSAMPLES, jobConcurrency.BULKUPSERTSAMPLES,
  bulkUpsertSamplesJob);
jobQueue.process(jobType.SAMPLE_TIMEOUT, jobConcurrency.SAMPLE_TIMEOUT,
  sampleTimeoutJob);
jobQueue.process(jobType.PERSIST_SAMPLE_STORE,
  jobConcurrency.PERSIST_SAMPLE_STORE, persistSampleStoreJob);
