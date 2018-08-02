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
 * tests/setup/signal.js
 */
'use strict'; // eslint-disable-line strict
const tu = require('../testUtils');
const sinon = require('sinon');
const expect = require('chai').expect;
const signal = require('../../signal/signal');
const supertest = require('supertest');

// toggle must be set before the app start as process.on(SIGTERM) is at app boot
tu.toggleOverride('enableSigtermEvent', true);
const app = supertest(require('../../index').app);

/**
 * This test is covering the scenario when receives from OS the SIGTERM
 * which has been handled in index.js
 */
describe('Validating SIGTERM from OS', () => {
  beforeEach(() => {
    sinon.stub(signal, 'gracefulShutdown');
    sinon.stub(signal, 'forceShutdownTimeout');
  });

  afterEach(() => {
    signal.gracefulShutdown.restore();
    signal.forceShutdownTimeout.restore();
  });

  after(() => tu.toggleOverride('enableSigtermEvent', false));

  it('should handles gracefully and close http server', (done) => {
    // When it receives the shutdown
    process.kill(process.pid, 'SIGTERM');

    setTimeout(() => {
      // Then signal's gracefulShutdown has been called
      expect(signal.gracefulShutdown.calledOnce).to.be.true;

      // and signal's forceShutDownApp timeout must be called
      expect(signal.forceShutdownTimeout.calledOnce).to.be.true;

      // http server must be closed
      app.get('v1/docs/')
        .catch((err) => {
          expect(err.message).to.be.equal('ECONNREFUSED: Connection refused');
          done();
        });
    }, 10);
  });
});
