/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/collector/utils.js
 */
'use strict'; // eslint-disable-line strict
const sinon = require('sinon');
const Promise = require('bluebird');
const fork = require('child_process').fork;
const conf = require('../../../config');

const clock = sinon.useFakeTimers(Date.now());
const subprocesses = {};
const url = `localhost:${conf.port}`;
let token;

module.exports = {
  doStart,
  doPause,
  doResume,
  doStop,
  setToken,
  blockHeartbeat,
  unblockHeartbeat,
  killAllCollectors,
  tick,
  tickSync,
  tickUntilComplete,
};

function doCommand({ command, name, url, token, refocusProxy, dataSourceProxy }) {
  const args = [command];
  if (name) args.push('--collectorName', name);
  if (url) args.push('--refocusUrl', url);
  if (token) args.push('--accessToken', token);
  if (refocusProxy) args.push('--refocusProxy', refocusProxy);
  if (dataSourceProxy) args.push('--dataSourceProxy', dataSourceProxy);
  return doFork(args, name);
}

function doFork(args) {
  const opts = {
    silent: true,
    env: {},
    // env: { DEBUG: 'refocus-collector:*' },
  };
  const forkPath = require.resolve('./runCollector');
  const subprocess = fork(forkPath, args, opts);
  subprocess.stdout.on('data', (data) => console.log(data.toString()));
  subprocess.stderr.on('data', (data) => console.error(data.toString()));
  return subprocess;
}

function doStart(name) {
  const subprocess = doCommand({ command: 'start', name, url, token });
  subprocesses[name] = subprocess;
  subprocess.on('message', (msg) => {
    if (msg.ticked) {
      const resolveTick = tickMap[name];
      delete tickMap[name];
      resolveTick && resolveTick();
    }
  });
  subprocess.on('exit', () => {
    tickMap[name] && tickMap[name]();
    delete subprocesses[name];
  });
  subprocess.send({ startTime: Date.now() });
  return new Promise((resolve) => subprocess.on('message', (msg) => {
    if (msg.started) resolve(subprocess);
  }));
}

function doPause(name) {
  const subprocess = doCommand({ command: 'pause', name, url, token });
  return new Promise((resolve) => subprocess.on('message', (msg) => {
    if (msg.started) resolve();
  }));
}

function doResume(name) {
  const subprocess = doCommand({ command: 'resume', name, url, token });
  return new Promise((resolve) => subprocess.on('message', (msg) => {
    if (msg.started) resolve();
  }));
}

function doStop(name) {
  const subprocess = doCommand({ command: 'stop', name, url, token });
  return new Promise((resolve) => subprocess.on('message', (msg) => {
    if (msg.started) resolve();
  }))
  .then(() => tickUntilComplete(awaitExit, name));
}

function setToken(_token) {
  token = _token;
}

function blockHeartbeat(collectorName) {
  subprocesses[collectorName].send({ blockHeartbeat: true });
}

function unblockHeartbeat(collectorName) {
  subprocesses[collectorName].send({ unblockHeartbeat: true });
}

function awaitExit(collectorName) {
  const subprocess = subprocesses[collectorName];
  if (subprocess && subprocess.connected) {
    return new Promise((resolve) => {
      subprocess.on('exit', () => {
        resolve();
      })
    });
  } else {
    return Promise.reject(Error('not running'));
  }
}

function killAllCollectors() {
  return Promise.map(
    Object.keys(subprocesses),
    (collectorName) => killCollector(collectorName),
  );

  function killCollector(collectorName) {
    const subprocess = subprocesses[collectorName];
    if (subprocess && subprocess.connected) {
      const promise = awaitExit(collectorName);
      delete subprocesses[collectorName];
      subprocess.kill();
      return promise;
    }
  }
}

const tickMap = {};
function tick(ms) {
  return tickSync(clock, ms)
  .then(() => {
    return Promise.map(Object.entries(subprocesses), ([name, subprocess]) => {
      subprocess.send({tick: ms});
      return new Promise((resolve) =>
        tickMap[name] = resolve
      );
    })
  });

}

function tickSync(clock, ms) {
  const timerResults = [];
  makeTimersSync();
  clock.tick(ms);
  return Promise.all(timerResults);

  function makeTimersSync() {
    if (!clock.timers) return;
    Object.values(clock.timers).forEach((timer) => {
      if (!timer.originalFunc) {
        timer.originalFunc = timer.func;
      }

      timer.func = (...args) => {
        const result = timer.originalFunc.apply(null, args);
        timerResults.push(result);
      };
    });
    return timerResults;
  }
}

let tickingPromises = [];
let readyToTick = [];
function tickUntilComplete(awaitFunc, collectorName) {
  const promise = awaitFunc(collectorName);
  readyToTick.push(promise);
  if (!tickingPromises.length) {
    tickUntilAllComplete()
  }

  return promise;

  function tickUntilAllComplete() {
    tickingPromises.push(...readyToTick);
    tickingPromises = tickingPromises.filter((promise) => promise.isPending());
    readyToTick = [];
    if (tickingPromises.length) {
      return tick(1000)
      .then(() => {
        return tickUntilAllComplete(tickingPromises);
      })
    }
  }
}
