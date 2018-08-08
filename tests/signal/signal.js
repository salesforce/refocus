/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
/**
 * This test is running in a separated test script to avoid tests side effect
 * since the sigterm test is executing process.kill to validate the event.
 *
 * test-graceful-shutdown in package.json.
 *
 * tests/signal/signal.js
 */
'use strict'; // eslint-disable-line strict
const sinon = require('sinon');
const expect = require('chai').expect;
const signal = require('../../signal/signal');
const jobSetup = require('../../jobQueue/setup');
const config = require('../../config');

describe('Signal handling graceful shutdown', () => {
  it('should execute gracefulShutdown for each dependency', (done) => {
    // Setup
    sinon.stub(jobSetup, 'gracefulShutdown');

    // When
    signal.gracefulShutdown();

    // Then Kue shutdown has been called
    expect(jobSetup.gracefulShutdown.calledOnce).to.be.true;

    jobSetup.gracefulShutdown.restore();
    done();
  });

  it('should execute process.exit when force shutdown', (done) => {
    // Setup
    sinon.stub(process, 'exit');
    const fakeSetTimeOut = sinon.useFakeTimers();

    // When
    signal.forceShutdownTimeout();

    // and tick the clock to the timeout
    fakeSetTimeOut.tick(config.waitingSigKillTimeout);

    // Then
    expect(process.exit.calledOnce).to.be.true;

    process.exit.restore();
    fakeSetTimeOut.restore();
    done();
  });
});
