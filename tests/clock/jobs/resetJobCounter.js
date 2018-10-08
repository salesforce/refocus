/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/jobs/resetJobCounter.js
 */
const tu = require('../../testUtils');
const expect = require('chai').expect;
const resetJobCounter = require('../../../clock/scheduledJobs/resetJobCounter');
const jobCleanup = require('../../../clock/scheduledJobs/jobCleanup');
const jobWrapper = require('../../../jobQueue/jobWrapper');
const jobSetup = require('../../../jobQueue/setup');
const jobQueue = jobSetup.jobQueue;
const conf = require('../../../config');
const Promise = require('bluebird');
jobQueue.completeAsync = Promise.promisify(jobQueue.complete);

describe('tests/clock/jobs/resetJobCounter.js >', () => {
  before(() => jobSetup.resetJobQueue());
  after(() => jobSetup.resetJobQueue());

  before((done) => {
    tu.toggleOverride('enableWorkerProcess', true);
    jobQueue.process('TEST', 100, testJob);
    done();
  });

  after((done) => {
    tu.toggleOverride('enableWorkerProcess', false);
    jobCleanup.execute().then(done).catch(done);
  });

  function testJob(job, done) {
    done();
  }

  function runJobs(jobCount) {
    return new Promise((resolve, reject) => {
      let completeCount = 0;
      for (let i = 0; i < jobCount; i++) {
        let job;
        job = jobWrapper.createJob('TEST');
        job.on('complete', () => {
          completeCount++;
          if (completeCount === jobCount) {
            resolve();
          }
        });
      }
    });
  }

  it('id counter reset', (done) => {
    const jobCount = 10;
    conf.JOB_REMOVAL_BATCH_SIZE = 5;
    conf.JOB_REMOVAL_DELAY = 0;

    runJobs(jobCount)
    .then(() => jobCleanup.execute())
    .then(() => runJobs(jobCount))
    .then(() => jobQueue.completeAsync())
    .then((ids) => { expect(ids[0]).to.be.greaterThan(jobCount); })
    .then(() => resetJobCounter.execute())
    .then(() => runJobs(jobCount))
    .then(() => jobQueue.completeAsync())
    .then((ids) => { expect(ids[0]).to.equal(1); })
    .then(done).catch(done);
  });
});
