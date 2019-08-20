/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/utils/utils.js
 */

'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const sinon = require('sinon');
const fork = require('child_process').fork;
const Promise = require('bluebird');
const ft = require('feature-toggles');
const ms = require('ms');
const { jobQueue } = require('../../../jobQueue/setup');

let jobTimes;
let jobCount;
let startTime;
let subprocess;
let clock;

module.exports = {
  trackExecutionTimes() {
    startTime = Date.now();
    clock = sinon.useFakeTimers(startTime);
    jobTimes = {};
  },

  clearTracking() {
    clock && clock.restore();
    clock = undefined;
    jobTimes = undefined;
    jobCount = undefined;
  },

  trackExecutionCount() {
    jobCount = {};
  },

  trackExecution(jobName, time) {
    if (jobTimes) {
      const relativeTime = time - startTime;
      if (!jobTimes[jobName]) jobTimes[jobName] = [];
      jobTimes[jobName].push(relativeTime);
    }

    if (jobCount) {
      if (!jobCount[jobName]) jobCount[jobName] = 0;
      jobCount[jobName]++;
    }
  },

  waitUntil(minutes) {
    const until = startTime + ms(minutes);
    const toTick = until - Date.now();
    clock.tick(toTick);
    if (subprocess && subprocess.connected) {
      subprocess.send({ tick: toTick });
      return new Promise((resolve) => {
        subprocess.on('message', (msg) => {
          if (msg.ticked) {
            resolve();
          }
        });
      });
    }
  },

  expectCalled(jobName, count) {
    if (count) {
      expect(jobCount[jobName]).to.be.at.least(1);
    } else {
      expect(jobCount[jobName]).to.not.exist;
    }
  },

  expectCalledAt(jobName, expectedTimes) {
    expectedTimes = expectedTimes.map(t=>ms(t));
    const actualTimes = jobTimes[jobName];
    expect(actualTimes).to.exist;
    expect(actualTimes.length).to.equal(expectedTimes.length);
    expectedTimes.forEach((expectedTime, i) => {
      const actualTime = actualTimes[i];
      const tolerance = ms('1s');
      expect(actualTime).to.be.closeTo(expectedTime, tolerance);
    });
  },

  runSetupIntervals(intervals, useWorker, toggles, env) {
    subprocess = doFork('./runSetupIntervals', [], env);

    // wait for start
    const awaitSetup = new Promise((resolve) => {
      subprocess.on('message', (msg) => {
        if (msg.started) resolve();
      });
    });

    // handle time messages
    subprocess.on('message', (msg) => {
      if (msg.executed) {
        this.trackExecution(msg.jobName, msg.time);
      }
    });

    // send start message with config
    const startTime = clock ? Date.now() : null;
    subprocess.send({ start: true, startTime, intervals, useWorker, toggles });
    return awaitSetup;
  },

  runClock(tick, env) {
    subprocess = doFork('./runClock', [], env);

    // wait for start
    const waitForCompletion = new Promise((resolve) => {
      subprocess.on('message', (msg) => {
        if (msg.done) resolve(msg.results);
      });
    });

    // send start message with tick
    subprocess.send({ start: true, tick });
    return waitForCompletion;
  },

  stopClockProcess() {
    if (subprocess && subprocess.connected) {
      const awaitExit = new Promise((resolve) =>
        subprocess.on('exit', resolve)
      );
      subprocess.kill();
      return awaitExit;
    }
  },

  restartClockProcess(clockJobConfig) {
    return this.stopClockProcess()
    .then(() => this.runSetupIntervals(clockJobConfig));
  },

  awaitWorkerCompletion() {
    return new Promise((resolve) => {
      if (ft.isFeatureEnabled('enableWorkerProcess')) {
        let jobCount = 0;
        jobQueue.on('job enqueue', () => jobCount++);
        jobQueue.on('job complete', () => {
          jobCount--;
          if (jobCount === 0) resolve();
        });
      } else {
        resolve();
      }
    });
  },
};

function doFork(path, args, env) {
  path = require.resolve(path);
  const opts = {
    silent: true,
    env,
  };

  const subprocess = fork(path, args, opts);
  subprocess.stdout.on('data', (data) => console.log(data.toString()));
  subprocess.stderr.on('data', (data) => console.error(data.toString()));
  return subprocess;
}

