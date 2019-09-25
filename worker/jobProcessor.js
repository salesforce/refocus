/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /worker/jobProcessor.js
 */
'use strict'; // eslint-disable-line strict
const { jobQueue, bulkDelSubQueue, executeClockJobQueue, bulkUpsertSamplesQueue } = require('../jobQueue/jobWrapper');
const executeClockJob = require('./jobs/executeClockJob');
const featureToggles = require('feature-toggles');

module.exports = {
  processJobs(jobs, jobConcurrency) {
    Object.entries(jobs).forEach(([jobName, job]) => {
      const concurrency = jobConcurrency[jobName];
      if (featureToggles.isFeatureEnabled('enableBullForBulkDelSubj') &&
        jobName === bulkDelSubQueue.name) {
        bulkDelSubQueue.process(Number(concurrency), job);
      } else if (featureToggles.isFeatureEnabled('enableBullForBulkUpsertSamples') &&
        jobName === bulkUpsertSamplesQueue.name) {
        bulkUpsertSamplesQueue.process(Number(concurrency), job);
      } else {
        jobQueue.process(jobName, concurrency, job);
      }
    });
  },

  processClockJobs(clockJobs, clockJobConfig) {
    Object.keys(clockJobs).forEach((jobName) => {
      if (clockJobConfig.useWorker[jobName]) {
        if (featureToggles.isFeatureEnabled('enableBullForExecuteClockJobs')) {
          executeClockJobQueue.process(1, executeClockJob);
        } else {
          jobQueue.process(jobName, 1, executeClockJob);
        }
      }
    });
  },
};
