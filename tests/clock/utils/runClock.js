/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/utils/runIndex.js
 */

'use strict'; // eslint-disable-line strict
const sinon = require('sinon');
const requireDir = require('require-dir');
const ms = require('ms');
const u = require('./utils');

// wait for start message
process.on('message', (msg) => {
  if (msg.start) {
    const tick = msg.tick;

    // setup spies
    const jobs = requireDir('../../../clock/scheduledJobs');
    const spies = {};
    Object.entries(jobs).forEach(([jobName, job]) => {
      spies[jobName] = sinon.spy(job, 'execute');
    });

    // run worker and setup promise to await completion
    const wait = u.awaitWorkerCompletion(spies.checkMissedCollectorHeartbeat);
    require('../../../worker/index.js');

    // run clock and count spy calls
    const clock = sinon.useFakeTimers(Date.now());
    require('../../../clock/index.js')
    .then(() => clock.tick(ms(tick)))
    .then(() => clock.restore())
    .then(() => wait)
    .then(() => {
      const results = {};
      Object.entries(spies).forEach(([jobName, spy]) => {
        results[jobName] = spy.callCount;
      });
      return results;
    })
    .then((results) => process.send({ done: true, results }));
  }
});
