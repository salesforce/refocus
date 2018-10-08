/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/utils/runSetupIntervals.js
 */

'use strict'; // eslint-disable-line strict
const sinon = require('sinon');
const featureToggles = require('feature-toggles');
const setupIntervals = require('../../../clock/setupIntervals');
const { environmentVariableTrue } = require('../../../config/toggles');
let clock;

// wait for start message
process.on('message', (msg) => {
  if (msg.start) {
    if (msg.startTime) clock = sinon.useFakeTimers(msg.startTime);

    // set up config
    const conf = {
      intervals: msg.intervals || {},
      useWorker: msg.useWorker || {},
      toggles: msg.toggles || {},
    };

    // set up mock jobs that send back the execution time
    const jobs = {};
    Object.keys(msg.intervals).forEach((jobName) => {
      jobs[jobName] = {
        execute() {
          const time = Date.now();
          process.send({ executed: true, jobName, time });
        },
      };
    });

    // set up toggles
    if (msg.toggles) {
      const toggles = {};
      Object.values(msg.toggles).forEach((toggleName) => {
        toggles[toggleName] = environmentVariableTrue(process.env, toggleName);
      });
      featureToggles.load(toggles);
    }

    // setupIntervals with the test jobs and config
    setupIntervals(jobs, conf)
    .then(() => process.send({ started: true }));
  }
});

// tick message
process.on('message', (msg) => {
  if (msg.tick) {
    clock.tick(msg.tick);
    process.send({ ticked: true });
  }
});
