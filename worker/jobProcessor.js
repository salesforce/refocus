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
 * The jobProcessor is a worker process which uses the "Kue" module to pull jobs
 * off the redis queue.
 */
'use strict'; // eslint-disable-line strict
const jobType = require('../jobQueue/setup').jobType;
const jobQueue = require('../jobQueue/jobWrapper').jobQueue;
const helper = require('../api/v1/helpers/nouns/samples');
const workerStarted = 'Worker Process Started';

console.log(workerStarted); // eslint-disable-line no-console

jobQueue.process(jobType.BULKUPSERTSAMPLES, (job, done) => {
  const samples = job.data;
  console.log('Job id being processed: ' + // eslint-disable-line no-console
                      job.id);
  helper.model.bulkUpsertByName(samples).then(() => done());
});
