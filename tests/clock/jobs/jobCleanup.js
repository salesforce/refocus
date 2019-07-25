/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/jobs/jobCleanup.js
 */
const tu = require('../../testUtils');
const expect = require('chai').expect;
const jobCleanup = require('../../../clock/scheduledJobs/jobCleanup');
const resetJobCounter = require('../../../clock/scheduledJobs/resetJobCounter');
const jobWrapper = require('../../../jobQueue/jobWrapper');
const jobSetup = require('../../../jobQueue/setup');
const jobQueue = jobSetup.jobQueue;
const executeClockJob = require('../../../worker/jobs/executeClockJob');

const conf = require('../../../config');
const Promise = require('bluebird');
const kue = require('kue');
const originalRangeByStateAsync = Promise.promisify(kue.Job.rangeByState);
jobQueue.completeCountAsync = Promise.promisify(jobQueue.completeCount);
jobQueue.completeAsync = Promise.promisify(jobQueue.complete);
const sinon = require('sinon');
const activityLogUtil = require('../../../utils/activityLog');

describe('tests/clock/jobs/jobCleanup.js >', () => {
  const MILLISECONDS_EXPRESSION = /^\d*ms/;

  before(() => jobSetup.resetJobQueue());
  after(() => jobSetup.resetJobQueue());

  before((done) => {
    tu.toggleOverride('enableWorkerProcess', true);
    tu.toggleOverride('enableJobCleanupActivityLogs', true);
    jobQueue.process('TEST', 100, testJob);
    done();
  });

  beforeEach((done) => {
    sinon.spy(activityLogUtil, 'printActivityLogString');
    conf.JOB_REMOVAL_DELAY = 0;
    conf.JOB_REMOVAL_BATCH_SIZE = 100;
    jobCleanup.execute()
    .then(resetJobCounter.execute)
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
    conf.JOB_REMOVAL_DELAY = 0;
    conf.JOB_REMOVAL_BATCH_SIZE = 100;
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
    conf.JOB_REMOVAL_DELAY = 0;
    const expectedCount = 0;

    it('jobs: 0, batchSize: 10', (done) => {
      const jobCount = 0;
      conf.JOB_REMOVAL_BATCH_SIZE = 10;
      conf.JOB_REMOVAL_DELAY = 0;

      expectNJobs(jobCount)
      .then(() => jobCleanup.execute())
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 1, removed: 0, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });

    it('jobs: 1, batchSize: 10', (done) => {
      const jobCount = 1;
      conf.JOB_REMOVAL_BATCH_SIZE = 10;

      runJobs(jobCount)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute())
      .then(() => expectNJobs(expectedCount))
      .then(() => {
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
      conf.JOB_REMOVAL_BATCH_SIZE = 10;

      runJobs(jobCount)
        .then(() => expectNJobs(jobCount))
        .then(() => jobCleanup.execute())
        .then(() => expectNJobs(expectedCount))
        .then(() => {
          sinon.assert.calledWith(
            activityLogUtil.printActivityLogString,
            sinon.match({ iterations: 1, removed: 5, skipped: 0, errors: 0,
              totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
            'jobCleanup'
          );
          done();
        })
        .catch(done);
    });

    it('jobs: 22, batchSize: 5', (done) => {
      const jobCount = 22;
      conf.JOB_REMOVAL_BATCH_SIZE = 5;

      runJobs(jobCount)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute())
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 5, removed: 22, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });

    it('jobs: 19, batchSize: 5', (done) => {
      const jobCount = 19;
      conf.JOB_REMOVAL_BATCH_SIZE = 5;

      runJobs(jobCount)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute())
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 4, removed: 19, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });

    it('jobs: 100, batchSize: 5', (done) => {
      const jobCount = 100;
      conf.JOB_REMOVAL_BATCH_SIZE = 5;

      runJobs(jobCount)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute())
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 21, removed: 100, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });

    it('jobs: 100, batchSize: 1', (done) => {
      const jobCount = 100;
      conf.JOB_REMOVAL_BATCH_SIZE = 1;

      runJobs(jobCount)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute())
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 101, removed: 100, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });

    it('batchSize: 0 (none removed)', (done) => {
      const jobCount = 5;
      conf.JOB_REMOVAL_BATCH_SIZE = 0;
      const expectedCountWhenNoneRemoved = 5;

      runJobs(jobCount)
      .then(() => expectNJobs(jobCount))
      .then(() => jobCleanup.execute())
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

    it('skip 3', (done) => {
      conf.JOB_REMOVAL_BATCH_SIZE = 5;
      conf.JOB_REMOVAL_DELAY = 350;
      const expectedCount = 3;
      interceptJobEndTimes(duration, durationType);

      runJobs(jobCount)
      .then(() => jobCleanup.execute())
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        // when delay applied log called twice.
        expect(activityLogUtil.printActivityLogString.calledTwice)
          .to.equal(true);
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 1, removed: 5, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 5, removed: 17, skipped: 3, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });

    it('skip 15', (done) => {
      conf.JOB_REMOVAL_BATCH_SIZE = 5;
      conf.JOB_REMOVAL_DELAY = 1550;
      const expectedCount = 15;
      interceptJobEndTimes(duration, durationType);

      runJobs(jobCount)
      .then(() => jobCleanup.execute())
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        // when delay applied log called twice.
        expect(activityLogUtil.printActivityLogString.calledTwice)
          .to.equal(true);
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 1, removed: 3, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 5, removed: 5, skipped: 15, errors: 0,
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

    it('skip 1/2', (done) => {
      const duration = [0, 100];
      conf.JOB_REMOVAL_BATCH_SIZE = 5;
      conf.JOB_REMOVAL_DELAY = 50;
      const expectedCount = 10;
      interceptJobEndTimes(duration, durationType);

      runJobs(jobCount)
      .then(() => jobCleanup.execute())
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        // when delay applied log called twice.
        expect(activityLogUtil.printActivityLogString.calledTwice)
          .to.equal(true);
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 1, removed: 15, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 5, removed: 10, skipped: 10, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });

    it('skip 1/4', (done) => {
      const duration = [0, 100, 200, 300];
      conf.JOB_REMOVAL_BATCH_SIZE = 5;
      conf.JOB_REMOVAL_DELAY = 50;
      const expectedCount = 5;
      interceptJobEndTimes(duration, durationType);

      runJobs(jobCount)
      .then(() => jobCleanup.execute())
      .then(() => expectNJobs(expectedCount))
      .then(() => {
        // when delay applied log called twice.
        expect(activityLogUtil.printActivityLogString.calledTwice)
          .to.equal(true);
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 1, removed: 10, skipped: 0, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        sinon.assert.calledWith(
          activityLogUtil.printActivityLogString,
          sinon.match({ iterations: 5, removed: 15, skipped: 5, errors: 0,
            totalTime: sinon.match(MILLISECONDS_EXPRESSION), }),
          'jobCleanup'
        );
        done();
      })
      .catch(done);
    });
  });

  function enqueueCleanupJob() {
    const data = {
      reqStartTime: Date.now(),
      clockJobName: 'jobCleanup',
    };
    const job = jobWrapper.createJob('jobCleanup', data);
    return new Promise((resolve) => {
      job.on('complete', resolve);
    });
  }

  describe('end-to-end >', () => {
    it('worker enabled', (done) => {
      conf.JOB_REMOVAL_BATCH_SIZE = 100;
      conf.JOB_REMOVAL_DELAY = 0;
      tu.toggleOverride('enableWorkerProcess', true);
      jobQueue.process('jobCleanup', executeClockJob);
      const jobCount = 10;
      const expectedCount = 1; // the cleanup job can't delete itself

      runJobs(jobCount)
      .then(() => expectNJobs(jobCount))
      .then(() => enqueueCleanupJob())
      .then(() => expectNJobs(expectedCount))
      .then(done).catch(done);
    });
  });
});
