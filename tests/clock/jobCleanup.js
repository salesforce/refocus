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
    jobCleanup.execute(100, 0).then(done).catch(done);
  });

  after((done) => {
    tu.toggleOverride('enableWorkerProcess', false);
    jobCleanup.execute(100, 0).then(done).catch(done);
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
    const duration = 0;
    const durationType = 'parallel';
    const delay = 0;

    it('jobs: 0, window: 10', (done) => {
      const jobCount = 0;
      const window = 10;
      const expectedCount = 0;

      expectNJobs(jobCount)
      .then(() => jobCleanup.execute(window, delay))
      .then(() => expectNJobs(expectedCount))
      .then(done).catch(done);
    });

    it('jobs: 1, window: 10', (done) => {
      const jobCount = 1;
      const window = 10;
      const expectedCount = 0;

      runJobs(jobCount, duration, durationType)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(window, delay))
      .then(() => expectNJobs(expectedCount))
      .then(done).catch(done);
    });

    it('jobs: 5, window: 10', (done) => {
      const jobCount = 5;
      const window = 10;
      const expectedCount = 0;

      runJobs(jobCount, duration, durationType)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(window, delay))
      .then(() => expectNJobs(expectedCount))
      .then(done).catch(done);
    });

    it('jobs: 22, window: 5', (done) => {
      const jobCount = 22;
      const window = 5;
      const expectedCount = 0;

      runJobs(jobCount, duration, durationType)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(window, delay))
      .then(() => expectNJobs(expectedCount))
      .then(done).catch(done);
    });

    it('jobs: 19, window: 5', (done) => {
      const jobCount = 19;
      const window = 5;
      const expectedCount = 0;

      runJobs(jobCount, duration, durationType)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(window, delay))
      .then(() => expectNJobs(expectedCount))
      .then(done).catch(done);
    });

    it('jobs: 100, window: 5', (done) => {
      const jobCount = 100;
      const window = 5;
      const expectedCount = 0;

      runJobs(jobCount, duration, durationType)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(window, delay))
      .then(() => expectNJobs(expectedCount))
      .then(done).catch(done);
    });

    it('jobs: 100, window: 1', (done) => {
      const jobCount = 100;
      const window = 1;
      const expectedCount = 0;

      runJobs(jobCount, duration, durationType)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(window, delay))
      .then(() => expectNJobs(expectedCount))
      .then(done).catch(done);
    });

    it('jobs: 5, window: 0', (done) => {
      const jobCount = 5;
      const window = 0;
      const expectedCount = 5;

      runJobs(jobCount, duration, durationType)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(window, delay))
      .then(() => expectNJobs(expectedCount))
      .then(done).catch(done);
    });

    it('jobs: 10, window: 1', (done) => {
      const jobCount = 10;
      const window = 1;
      const expectedCount = 0;

      runJobs(jobCount, duration, durationType)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(window, delay))
      .then(() => expectNJobs(expectedCount))
      .then(done).catch(done);
    });

  });

  describe('delay - staggered - ', () => {
    const duration = 10;
    const durationType = 'staggered';
    const window = 5;

    it('jobs: 20, delay: 39ms', (done) => {
      const jobCount = 20;
      const delay = 39;
      const expectedCount = 3;

      runJobs(jobCount, duration, durationType)
      .then(() => jobCleanup.execute(window, delay))
      .then(() => expectNJobs(expectedCount))
      .then(done).catch(done);
    });

    it('jobs: 20, delay: 159ms', (done) => {
      const jobCount = 20;
      const delay = 159;
      const expectedCount = 15;

      runJobs(jobCount, duration, durationType)
      .then(() => jobCleanup.execute(window, delay))
      .then(() => expectNJobs(expectedCount))
      .then(done).catch(done);
    });

    it('jobs: 52, delay: 159ms', (done) => {
      const jobCount = 52;
      const delay = 159;
      const expectedCount = 15;

      runJobs(jobCount, duration, durationType)
      .then(() => jobCleanup.execute(window, delay))
      .then(() => expectNJobs(expectedCount))
      .then(done).catch(done);
    });
  });

  describe('delay - non-contiguous - ', () => {
    const duration = [10, 100];
    const durationType = 'non-contiguous';
    const window = 5;

    it('jobs: 20, delay: 80ms', (done) => {
      const jobCount = 20;
      const delay = 80;
      const expectedCount = 10;

      runJobs(jobCount, duration, durationType)
      .then(() => jobCleanup.execute(window, delay))
      .then(() => expectNJobs(expectedCount))
      .then(done).catch(done);
    });

    it('jobs: 100, delay: 90ms', (done) => {
      const duration = [10, 100, 200, 300];
      const jobCount = 100;
      const delay = 90;
      const expectedCount = 25;

      runJobs(jobCount, duration, durationType)
      .then(() => jobCleanup.execute(window, delay))
      .then(() => expectNJobs(expectedCount))
      .then(done).catch(done);
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
      .then(done).catch(done);
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
          .then(done).catch(done);
        });
      })
      .catch(done);
    });

  });

  it('id counter reset', (done) => {
    const jobCount = 10;
    const duration = 0;
    const durationType = 'parallel';
    const window = 5;
    const delay = 0;

    runJobs(jobCount, duration, durationType)
    .then(() => jobCleanup.execute(window, delay))
    .then(() => runJobs(jobCount, duration, durationType))
    .then(() => jobQueue.completeAsync())
    .then((ids) => { expect(ids[0]).to.be.greaterThan(jobCount); })
    .then(() => jobCleanup.resetCounter())
    .then(() => runJobs(jobCount, duration, durationType))
    .then(() => jobQueue.completeAsync())
    .then((ids) => { expect(ids[0]).to.equal(1); })
    .then(done).catch(done);
  });

});
