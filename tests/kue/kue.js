/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
/**
 * This test is covering Kue shutdown for jobQueue/setup file.
 *
 * In order to avoid side effect to the other tests when shutting down Kue's
 * job, we created a separated script called test-kue in package.json.
 *
 * tests/jobQueue/setup.js
 */
'use strict'; // eslint-disable-line strict
const tu = require('../testUtils');
const sinon = require('sinon');
const expect = require('chai').expect;
const activityLogUtil = require('../../utils/activityLog');
const jobQueueSetup = require('../../jobQueue/setup');
const jobQueue = jobQueueSetup.jobQueue;

require('../../index');

describe('Kue jobQueue graceful shutdown', () => {
  beforeEach(() => {
    tu.toggleOverride('enableSigtermActivityLog', true);
    sinon.spy(activityLogUtil, 'printActivityLogString');
    sinon.spy(jobQueue, 'shutdown');
  });

  afterEach(() => {
    activityLogUtil.printActivityLogString.restore();
    jobQueue.shutdown.restore();
  });

  after(() => {
    tu.toggleOverride('enableSigtermActivityLog', false);
  });

  it('should shutdown job kue and print activity', (done) => {
    // When
    jobQueueSetup.gracefulShutdown();

    setTimeout(() => {
      // Then Kue shutdown has been called
      expect(jobQueue.shutdown.calledOnce).to.be.true;

      // And log activity is printed as expected
      expect(activityLogUtil.printActivityLogString.calledOnce).to.be.true;
      sinon.assert.calledWith(
        activityLogUtil.printActivityLogString,
        sinon.match({
          status: 'Job queue shutdown: OK',
          totalTime: sinon.match(/^\d*ms/),
        }), 'sigterm'
      );

      done();
    }, 10);
  });

  it('Must not be able to shutdown when is already shutting down', (done) => {
    jobQueueSetup.gracefulShutdown();
    setTimeout(() => {
      expect(activityLogUtil.printActivityLogString.calledOnce).to.be.true;
      sinon.assert.calledWith(
        activityLogUtil.printActivityLogString,
        sinon.match({
          status: 'Job queue shutdown: Error: Shutdown already in progress',
          totalTime: sinon.match(/^\d*ms/),
        }),
        'sigterm'
      );

      const expectedError = 'INCR can\'t be processed. The connection' +
        ' is already closed.';
      const job = jobQueue.create('test', { foo: 'blah' });
      job.save((err) => {
        expect(err.message).to.be.equal(expectedError);
        done();
      });
    }, 10);
  });
});

