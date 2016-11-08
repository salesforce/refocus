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
 * joProcessor is a worker process, that acts as a consumer to process the jobs
 * saved in the redis queue. The "Kue" module is used for this purpose.
 */
'use strict'; // eslint-disable-line strict

const jobType = require('../jobQueue/setup').jobType;
const jobQueue = require('../jobQueue/jobWrapper').jobQueue;
const helper = require('../api/v1/helpers/nouns/samples');
const workerStarted = 'Worker Process Started';

console.log(workerStarted); // eslint-disable-line no-console

jobQueue.process(jobType.bulkUpsertSamples, (job, done) => {
  const samples = job.data;
  console.log('job id being processed' + job.id);
  helper.model.bulkUpsertByName(samples).then(() => {
    done();  
  });
});
