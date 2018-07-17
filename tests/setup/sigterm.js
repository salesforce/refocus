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
const jobQueue = require('../../jobQueue/setup').jobQueue;

// It starts app context
require('../../index');

describe('SIGTERM Signal handling', () => {

  beforeEach(() => {
    tu.toggleOverride('enableSigtermActivityLog', true);
    sinon.spy(activityLogUtil, 'printActivityLogString');
    sinon.spy(jobQueue, 'shutdown');
    sinon.spy(process, 'exit');
  });

  afterEach(() => {
    activityLogUtil.printActivityLogString.restore();
    jobQueue.shutdown.restore();
    process.exit.restore();
  });

  after(() => {
    tu.toggleOverride('enableSigtermActivityLog', false);
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  });

  it('should print log and shutdown job kue when receiving a SIGTERM',
    (done) => {
    process.once('exit', () => {
      /*
       must be 'exit' otherwise (once SIGTERM), log activity happens after
       this check.
       */
      expect(activityLogUtil.printActivityLogString.calledOnce).to.be.true;
      sinon.assert.calledWith(
        activityLogUtil.printActivityLogString,
        sinon.match({ status: 'Job queue shutdown: OK',
          totalTime: sinon.match(/^\d*ms/), }),
        'sigterm'
      );

      expect(jobQueue.shutdown.calledOnce).to.be.true;
      expect(process.exit.calledOnce).to.be.true;
      done();
    });
    process.kill(process.pid, 'SIGTERM');
  });
});
