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
const kue = require('kue');
const originalRangeByStateAsync = Promise.promisify(kue.Job.rangeByState);
jobQueue.completeCountAsync = Promise.promisify(jobQueue.completeCount);
jobQueue.completeAsync = Promise.promisify(jobQueue.complete);
const sinon = require('sinon');
const activityLogUtil = require('../../utils/activityLog');

describe('tests/clock/jobCleanup.js >', () => {
  const MILLISECONDS_EXPRESSION = /^\d*ms/;

  before((done) => {
    tu.toggleOverride('enableWorkerProcess', true);
    tu.toggleOverride('enableJobCleanupActivityLogs', true);
    jobQueue.process('TEST', 100, testJob);
    done();
  });

  beforeEach((done) => {
    sinon.spy(activityLogUtil, 'printActivityLogString');

    jobCleanup.execute(100, 0)
    .then(jobCleanup.resetCounter())
    .then(done)
    .catch(done);
  });

  afterEach((done) => {
    activityLogUtil.printActivityLogString.restore();
    done();
  });

  after((done) => {
    tu.toggleOverride('enableWorkerProcess', false);
    tu.toggleOverride('enableJobCleanupActivityLogs', false);
    jobCleanup.execute(100, 0).then(done).catch(done);
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

  // Overwrite the function used by jobCleanup to retrieve the jobs
  // to set mock end times for testing
  function interceptJobEndTimes(duration, durationType) {
    let now;
    kue.Job.rangeByStateAsync = function (state, from, to, order) {
      if (!now) now = Date.now();
      return originalRangeByStateAsync(state, from, to, order)
      .then((jobs) => {
        jobs.forEach((job) => {
          if (durationType === 'staggered') {
            job.updated_at = now - job.id * duration;
          } else if (durationType === 'non-contiguous' && Array.isArray(duration)) {
            job.updated_at = now - duration[job.id % duration.length];
          }
        });
        return jobs;
      });
    };
  }

  function expectNJobs(n) {
    return jobQueue.completeCountAsync()
    .then((count) => { expect(count).to.equal(n); });
  }

  describe('no delay >', () => {
    const delay = 0;
    const expectedCount = 0;

    it('jobs: 0, batchSize: 10', (done) => {
      const jobCount = 0;
      const batchSize = 10;

      expectNJobs(jobCount)
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        expect(activityLogUtil.printActivityLogString.calledOnce)
          .to.equal(true);
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 20, removed: 20, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });

    it('jobs: 1, batchSize: 10', (done) => {
      const jobCount = 1;
      const batchSize = 10;

      runJobs(jobCount)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        expect(activityLogUtil.printActivityLogString.calledOnce)
          .to.equal(true);
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 1, removed: 1, skipped: 0, errors: 0,
          totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });

    it('jobs: 5, batchSize: 10', (done) => {
      const jobCount = 5;
      const batchSize = 10;

      runJobs(jobCount)
        .then(() => expectNJobs(jobCount))
        .then(() => jobCleanup.execute(batchSize, delay))
        .then(() => expectNJobs(expectedCount))
        .then(() => {
          expect(activityLogUtil.printActivityLogString.calledOnce)
            .to.equal(true);
          sinon.assert.calledWith(
            activityLogUtil.printActivityLogString,
            sinon.match({ iterations: 5, removed: 5, skipped: 0, errors: 0,
              totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
            'jobCleanup'
          );
          done();
        })
        .catch(done);
    });

    it('jobs: 22, batchSize: 5', (done) => {
      const jobCount = 22;
      const batchSize = 5;

      runJobs(jobCount)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        expect(activityLogUtil.printActivityLogString.calledOnce)
          .to.equal(true);
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 22, removed: 22, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });

    it('jobs: 19, batchSize: 5', (done) => {
      const jobCount = 19;
      const batchSize = 5;

      runJobs(jobCount)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        expect(activityLogUtil.printActivityLogString.calledOnce)
          .to.equal(true);
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 19, removed: 19, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });

    it('jobs: 100, batchSize: 5', (done) => {
      const jobCount = 100;
      const batchSize = 5;

      runJobs(jobCount)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        expect(activityLogUtil.printActivityLogString.calledOnce)
          .to.equal(true);
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 100, removed: 100, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });

    it('jobs: 100, batchSize: 1', (done) => {
      const jobCount = 100;
      const batchSize = 1;

      runJobs(jobCount)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        expect(activityLogUtil.printActivityLogString.calledOnce)
          .to.equal(true);
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 100, removed: 100, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });

    it('batchSize: 0 (none removed)', (done) => {
      const jobCount = 5;
      const batchSize = 0;
      const expectedCountWhenNoneRemoved = 5;

      runJobs(jobCount)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCountWhenNoneRemoved))
      .then(() => {
        expect(activityLogUtil.printActivityLogString.calledOnce)
          .to.equal(false);
        done();
      })
      .catch(done);
    });
  });

  describe('delay - staggered >', () => {
    const durationType = 'staggered';
    const duration = 100;
    const jobCount = 20;
    const batchSize = 5;

    it('skip 3', (done) => {
      const delay = 350;
      const expectedCount = 3;
      interceptJobEndTimes(duration, durationType);

      runJobs(jobCount)
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        // when delay applied log called twice.
        expect(activityLogUtil.printActivityLogString.calledTwice)
          .to.equal(true);
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 5, removed: 5, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 20, removed: 17, skipped: 3, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });

    it('skip 15', (done) => {
      const delay = 1550;
      const expectedCount = 15;
      interceptJobEndTimes(duration, durationType);

      runJobs(jobCount)
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        // when delay applied log called twice.
        expect(activityLogUtil.printActivityLogString.calledTwice)
          .to.equal(true);
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 3, removed: 3, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 20, removed: 5, skipped: 15, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });
  });

  describe('delay - non-contiguous >', () => {
    const durationType = 'non-contiguous';
    const jobCount = 20;
    const batchSize = 5;

    it('skip 1/2', (done) => {
      const duration = [0, 100];
      const delay = 50;
      const expectedCount = 10;
      interceptJobEndTimes(duration, durationType);

      runJobs(jobCount)
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        // when delay applied log called twice.
        expect(activityLogUtil.printActivityLogString.calledTwice)
          .to.equal(true);
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 15, removed: 15, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 20, removed: 10, skipped: 10, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });

    it('skip 1/4', (done) => {
      const duration = [0, 100, 200, 300];
      const delay = 50;
      const expectedCount = 5;
      interceptJobEndTimes(duration, durationType);

      runJobs(jobCount)
      .then(() => jobCleanup.execute(batchSize, delay))
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        // when delay applied log called twice.
        expect(activityLogUtil.printActivityLogString.calledTwice)
          .to.equal(true);
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 10, removed: 10, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 20, removed: 15, skipped: 5, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });
  });

  describe('end-to-end >', () => {
    jobQueue.process(jobType.JOB_CLEANUP, jobCleanupJob);
    conf.JOB_REMOVAL_DELAY = 0;

    it('worker disabled', (done) => {
      const jobCount = 10;
      const expectedCount = 0;

      runJobs(jobCount)
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

      runJobs(jobCount)
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
    const batchSize = 5;
    const delay = 0;

    runJobs(jobCount)
    .then(() => jobCleanup.execute(batchSize, delay))
    .then(() => runJobs(jobCount))
    .then(() => jobQueue.completeAsync())
    .then((ids) => { expect(ids[0]).to.be.greaterThan(jobCount); })
    .then(() => jobCleanup.resetCounter())
    .then(() => runJobs(jobCount))
    .then(() => jobQueue.completeAsync())
    .then((ids) => { expect(ids[0]).to.equal(1); })
    .then(done).catch(done);
  });
});
