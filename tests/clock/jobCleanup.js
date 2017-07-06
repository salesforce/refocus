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
const getHierarchyJob = require('../../worker/jobs/getHierarchyJob');
const jobCleanup = require('../../clock/scheduledJobs/jobCleanup');
const jobWrapper = require('../../jobQueue/jobWrapper');
const jobSetup = require('../../jobQueue/setup');
const jobQueue = jobSetup.jobQueue;

function testJob(job, done) {
  setTimeout(done, 100);
}

describe('jobCleanup', () => {
  before(() => {
    tu.toggleOverride('enableWorkerProcess', true);
    tu.toggleOverride('instrumentKue', true);
    jobQueue.process('TEST', testJob);
  });

  after(() => {
    tu.toggleOverride('enableWorkerProcess', false);
    tu.toggleOverride('instrumentKue', false);
  });

  it('one job', (done) => {
    jobWrapper.createJob('TEST')
    .on('complete', () => {
      jobQueue.completeCount((err, count) => {
        expect(count).to.equal(1);

        jobCleanup.execute().then(() => {
          jobQueue.completeCount((err, count) => {
            if (err) done(err);
            expect(count).to.equal(0);
            done();
          });
        }).catch(done);

      });
    });
  });

  it('multiple jobs', (done) => {
    jobWrapper.createJob('TEST')
    .on('complete', () => {
      jobWrapper.createJob('TEST')
      .on('complete', () => {
        jobWrapper.createJob('TEST')
        .on('complete', () => {
          jobQueue.completeCount((err, count) => {
            expect(count).to.equal(3);

            jobCleanup.execute().then(() => {
              jobQueue.completeCount((err, count) => {
                if (err) done(err);
                expect(count).to.equal(0);
                done();
              });
            }).catch(done);

          });
        });
      });
    });
  });

});
