/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/jobCleanup.js
 */
const tu = require('../testUtils');
const expect = require('chai').expect;
const jobCleanup = require('../../clock/scheduledJobs/jobCleanup');
const jobWrapper = require('../../jobQueue/jobWrapper');
const jobSetup = require('../../jobQueue/setup');
const jobQueue = jobSetup.jobQueue;
const jobType = jobSetup.jobType;
const jobCleanupJob = require('../../worker/jobs/jobCleanupJob');
const conf = require('../../config');
const Promise = require('bluebird');
jobQueue.completeCountAsync = Promise.promisify(jobQueue.completeCount);
jobQueue.completeAsync = Promise.promisify(jobQueue.complete);

describe('jobCleanup', () => {

  before((done) => {
    tu.toggleOverride('enableWorkerProcess', true);
    jobQueue.process('TEST', 100, testJob);
    done();
  });

  beforeEach((done) => {
    jobCleanup.execute(100, 0).then(() => done()).catch(done);
  });

  after((done) => {
    tu.toggleOverride('enableWorkerProcess', false);
    jobCleanup.execute(100, 0).then(() => done()).catch(done);
  });

  function testJob(job, done) {
    setTimeout(done, job.data);
  }

  function runJobs(jobCount, duration, durationType) {
    return new Promise((resolve, reject) => {
      let completeCount = 0;
      for (let i = 0; i < jobCount; i++) {
        let job;

        if (durationType === 'parallel') {
          job = jobWrapper.createJob('TEST', duration);
        } else if (durationType === 'staggered') {
          job = jobWrapper.createJob('TEST', i * duration);
        } else if (durationType === 'non-contiguous' && Array.isArray(duration)) {
          job = jobWrapper.createJob('TEST', duration[i % duration.length]);
        }

        job.on('complete', () => {
          completeCount++;
          if (completeCount === jobCount) {
            setTimeout(resolve, duration);
          }
        });
      }
    });
  }

  function expectNJobs(n) {
    return jobQueue.completeCountAsync()
    .then((count) => { expect(count).to.equal(n); });
  }

  describe('no delay - ', () => {
    const durationType = 'parallel';
    const duration = 0;
    const delay = 0;
    const expectedCount = 0;

    it('jobs: 0, batchSize: 10', (done) => {
      const jobCount = 0;
      const batchSize = 10;

      expectNJobs(jobCount)
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => done()).catch(done);
    });

    it('jobs: 1, batchSize: 10', (done) => {
      const jobCount = 1;
      const batchSize = 10;

      runJobs(jobCount, duration, durationType)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => done()).catch(done);
    });

    it('jobs: 5, batchSize: 10', (done) => {
      const jobCount = 5;
      const batchSize = 10;

      runJobs(jobCount, duration, durationType)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => done()).catch(done);
    });

    it('jobs: 22, batchSize: 5', (done) => {
      const jobCount = 22;
      const batchSize = 5;

      runJobs(jobCount, duration, durationType)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => done()).catch(done);
    });

    it('jobs: 19, batchSize: 5', (done) => {
      const jobCount = 19;
      const batchSize = 5;

      runJobs(jobCount, duration, durationType)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => done()).catch(done);
    });

    it('jobs: 100, batchSize: 5', (done) => {
      const jobCount = 100;
      const batchSize = 5;

      runJobs(jobCount, duration, durationType)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => done()).catch(done);
    });

    it('jobs: 100, batchSize: 1', (done) => {
      const jobCount = 100;
      const batchSize = 1;

      runJobs(jobCount, duration, durationType)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => done()).catch(done);
    });

    it('batchSize: 0 (none removed)', (done) => {
      const jobCount = 5;
      const batchSize = 0;
      const expectedCount = 5;

      runJobs(jobCount, duration, durationType)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => done()).catch(done);
    });

  });

  describe('delay - staggered - ', () => {
    const durationType = 'staggered';
    const duration = 50;
    const jobCount = 20;
    const batchSize = 5;

    it('skip 3', (done) => {
      const delay = 190;
      const expectedCount = 3;

      runJobs(jobCount, duration, durationType)
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => done()).catch(done);
    });

    it('skip 15', (done) => {
      const delay = 790;
      const expectedCount = 15;

      runJobs(jobCount, duration, durationType)
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => done()).catch(done);
    });

  });

  describe('delay - non-contiguous - ', () => {
    const durationType = 'non-contiguous';
    const jobCount = 20;
    const batchSize = 5;

    it('skip 1/2', (done) => {
      const duration = [0, 100];
      const delay = 90;
      const expectedCount = 10;

      runJobs(jobCount, duration, durationType)
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => done()).catch(done);
    });

    it('skip 1/4', (done) => {
      const duration = [0, 100, 200, 300];
      const delay = 90;
      const expectedCount = 5;

      runJobs(jobCount, duration, durationType)
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => done()).catch(done);
    });
  });

  describe('end-to-end - ', () => {
    jobQueue.process(jobType.JOB_CLEANUP, jobCleanupJob);
    const duration = 0;
    const durationType = 'parallel';
    conf.JOB_REMOVAL_DELAY = 0;

    it('worker disabled', (done) => {
      const jobCount = 10;
      const expectedCount = 0;

      runJobs(jobCount, duration, durationType)
      .then(() => expectNJobs(jobCount))
      .then(() => {
        tu.toggleOverride('enableWorkerProcess', false);
        return jobCleanup.enqueue();
      })
      .then(() => expectNJobs(expectedCount))
      .then(() => done()).catch(done);
    });

    it('worker enabled', (done) => {
      tu.toggleOverride('enableWorkerProcess', true);
      const jobCount = 10;
      const expectedCount = 1; // the cleanup job can't delete itself

      runJobs(jobCount, duration, durationType)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.enqueue())
      .then((job) => {
        job.on('complete', () => {
          expectNJobs(expectedCount)
          .then(() => done()).catch(done);
        });
      })
      .catch(done);
    });

  });

  it('id counter reset', (done) => {
    const jobCount = 10;
    const duration = 0;
    const durationType = 'parallel';
    const batchSize = 5;
    const delay = 0;

    runJobs(jobCount, duration, durationType)
    .then(() => jobCleanup.execute(batchSize, delay))
    .then(() => runJobs(jobCount, duration, durationType))
    .then(() => jobQueue.completeAsync())
    .then((ids) => { expect(ids[0]).to.be.greaterThan(jobCount); })
    .then(() => jobCleanup.resetCounter())
    .then(() => runJobs(jobCount, duration, durationType))
    .then(() => jobQueue.completeAsync())
    .then((ids) => { expect(ids[0]).to.equal(1); })
    .then(() => done()).catch(done);
  });

});
