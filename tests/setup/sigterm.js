/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/setup/sigterm.js
 */
'use strict'; // eslint-disable-line strict
const tu = require('../testUtils');
const sinon = require('sinon');
const expect = require('chai').expect;
const activityLogUtil = require('../../utils/activityLog');
const jobQueueSetup = require('../../jobQueue/setup');
const jobQueue = jobQueueSetup.jobQueue;

require('../../index');

describe('SIGTERM Signal handling', () => {
  beforeEach(() => {
    tu.toggleOverride('enableSigtermActivityLog', true);
    sinon.spy(activityLogUtil, 'printActivityLogString');
    sinon.spy(jobQueueSetup, 'gracefulShutdown');
    sinon.spy(jobQueue, 'shutdown');
    sinon.spy(process, 'exit');
  });

  afterEach(() => {
    activityLogUtil.printActivityLogString.restore();
    jobQueue.shutdown.restore();
    jobQueueSetup.gracefulShutdown.restore();
    process.exit.restore();
  });

  after(() => {
    tu.toggleOverride('enableSigtermActivityLog', false);
  });

  it('should shutdown job kue when receiving a SIGTERM', (done) => {
    process.kill(process.pid, 'SIGTERM');

    setTimeout(() => {
      // Queue setup has been called
      expect(jobQueueSetup.gracefulShutdown.calledOnce).to.be.true;
      expect(activityLogUtil.printActivityLogString.calledOnce).to.be.true;
      sinon.assert.calledWith(
        activityLogUtil.printActivityLogString,
        sinon.match({
          status: 'Job queue shutdown: OK',
          totalTime: sinon.match(/^\d*ms/),
        }), 'sigterm'
      );

      // Kue has been called
      expect(jobQueue.shutdown.calledOnce).to.be.true;

      /*
        Process.exit must not be executed
        Executes exceptionally after 1 min if there is no SIGKILL.
      */
      expect(process.exit.calledOnce).to.be.false;
      done();
    }, 10);
  });

  it('Must not be able to shutdown when Kue is shutting down', (done) => {
    process.kill(process.pid, 'SIGTERM');
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
      done();
    }, 10);
  });
});
