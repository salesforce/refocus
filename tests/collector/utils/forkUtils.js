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
const logger = require('@salesforce/refocus-logging-client');
const expect = require('chai').expect;
const sinon = require('sinon');
const Promise = require('bluebird');
const fork = require('child_process').fork;
const conf = require('../../../config');
const awaitImmediate = require('util').promisify(setImmediate);

const clock = sinon.useFakeTimers({
  // override so we don't mock setImmediate
  toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
  now: Date.now(),
});
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
  killCollector,
  setupMocking,
  expectLogins,
  tick,
  tickSync,
  tickFor,
  tickUntilComplete,
};

let nockConfig;
function setupMocking(conf) {
  nockConfig = conf;
  return Promise.map(Object.values(subprocesses), (subprocess) =>
    new Promise((resolve) => {
      subprocess.on('message', (msg) => {
        if (msg.mocked) resolve();
      });
      subprocess.send({ nockConfig });
    })
  );
}

function getRequestCount(collectorName, key) {
  return new Promise((resolve) => {
    subprocesses[collectorName].on('message', (msg) => {
      if (msg.hasOwnProperty('requestCount')) {
        resolve(msg.requestCount);
      }
    });
    subprocesses[collectorName].send({ getRequestCount: { key } });
  });
}

function expectLogins(collectorName, expectedCount) {
  return getRequestCount(collectorName, '/login - 200')
         .then((numLogins) => expect(numLogins).to.equal(expectedCount));
}

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
  subprocess.stdout.on('data', (data) => logger.info(data.toString()));
  subprocess.stderr.on('data', (data) => logger.error(data.toString()));
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
  subprocess.send({ nockConfig });
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
  return new Promise((resolve) => {
    subprocesses[collectorName].on('message', (msg) => {
      if (msg.blocked) resolve();
    });
  });
}

function unblockHeartbeat(collectorName) {
  subprocesses[collectorName].send({ unblockHeartbeat: true });
  return new Promise((resolve) => {
    subprocesses[collectorName].on('message', (msg) => {
      if (msg.unblocked) resolve();
    });
  });
}

function awaitExit(collectorName) {
  const subprocess = subprocesses[collectorName];
  if (subprocess && subprocess.connected) {
    return new Promise((resolve) => {
      subprocess.on('exit', () => {
        delete subprocesses[collectorName];
        resolve();
      });
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
}

function killCollector(collectorName) {
  const subprocess = subprocesses[collectorName];
  if (subprocess && subprocess.connected) {
    const promise = awaitExit(collectorName);
    delete subprocesses[collectorName];
    subprocess.kill();
    return promise;
  }
}

const tickMap = {};
function tick(ms) {
  return tickSync(clock, ms)
  .then(() =>
    Promise.each(Object.entries(subprocesses), ([name, subprocess]) => {
      subprocess && subprocess.connected && subprocess.send({ tick: ms });
      return new Promise((resolve) =>
        tickMap[name] = resolve
      );
    })
  );

}

function tickSync(clock, ms) {
  const timerFuncs = [];
  makeTimersSync();
  clock.tick(ms);
  return Promise.each(
    timerFuncs,
    (runNextTimerToCompletion) => runNextTimerToCompletion(),
  );

  function makeTimersSync() {
    if (!clock.timers) return;
    Object.values(clock.timers).forEach((timer) => {
      if (!timer.originalFunc) {
        timer.originalFunc = timer.func;
      }

      timer.func = (...args) => {
        const result = timer.originalFunc.bind(null, args);
        timerFuncs.push(result);
      };
    });
    return timerFuncs;
  }
}

function tickFor(ms) {
  const endTime = Date.now() + ms;
  return tickUntilTime(endTime);

  function tickUntilTime(endTime) {
    if (Date.now() >= endTime) {
      return Promise.resolve();
    } else {
      return tick(1000)
      .then(() => tickUntilTime(endTime));
    }
  }
}

let tickingPromises = [];
let readyToTick = [];
let readyToResolve = [];
let readyToReject = [];
function tickUntilComplete(awaitFunc, collectorName) {
  const awaitPromise = awaitFunc(collectorName);
  readyToTick.push(awaitPromise);
  if (!tickingPromises.length) {
    tickUntilAllComplete();
  }

  // wait until the end of the tick cycle to resolve
  return awaitPromise
  .then((res) => new Promise((resolve) =>
    readyToResolve.push(() => resolve(res))
  ))
  .catch((err) => new Promise((resolve, reject) =>
    readyToReject.push(() => reject(err))
  ));

  function tickUntilAllComplete() {
    tickingPromises.push(...readyToTick);
    tickingPromises = tickingPromises.filter((promise) => promise.isPending());
    readyToTick = [];
    if (tickingPromises.length) {
      return awaitImmediate()
      .then(() => tick(1000))
      .then(() => {
        readyToResolve.forEach(resolve => resolve());
        readyToReject.forEach(reject => reject());
        readyToResolve = [];
        readyToReject = [];
        return tickUntilAllComplete(tickingPromises);
      });
    }
  }
}
