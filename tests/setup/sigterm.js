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
const sinon = require('sinon');
const supertest = require('supertest');
const app = supertest(require('../../index').app);
const server = require('http').Server(app);

describe('SIGTERM Signal handling', () => {
  let closeStub;

  beforeEach(() => {
    sinon.spy(server, 'close');
  });

  afterEach(() => {
    server.close.restore();
  });

  // Don't call the stopHandler when exiting the test.
  after(() => {
    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
  });

  it('should call server.close() when receiving a SIGTERM', (done) => {
    process.once('SIGTERM', () => {
      expect(server.close.cal);
      done();
    });
    process.kill(process.pid, 'SIGTERM');
  });

  // it.skip(`should call 'process.exit()' after ${settings.stopTimeout}
  //       seconds when receiving a ${SIGNAL}`, (done) => {
  //   process.once(SIGNAL, () => {
  //
  //     /*
  //       It shouldn't have called `process.exit()` right after the signal
  //       was sent.
  //     */
  //     sinon.assert.notCalled(exitStub);
  //
  //     // set clock a bit after the timeout
  //     sandbox.clock.tick(settings + 10);
  //
  //     /*
  //       Timeout handler should have triggered and process.exit() should
  //       have been executed.
  //     */
  //     sinon.assert.calledOnce(exitStub);
  //     done();
  //   });
  //   process.kill(process.pid, SIGNAL);
  // });
});
