/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/collector/integration/runCollector.js
 */
'use strict'; // eslint-disable-line strict
const nock = require('nock');
const sinon = require('sinon');
const u = require('./forkUtils');
let clock;
const trackedRequests = {};

// mock the data sources for the collector
process.on('message', (msg) => {
  if (msg.nockConfig) {
    nock.cleanAll();

    msg.nockConfig.forEach((conf) => {
      let interceptor = nock(conf.url);

      interceptor.persist()
      [conf.method](conf.path, conf.matchBody)
      .reply(conf.status, conf.response, conf.headers);

      if (conf.matchHeaders) {
        Object.entries(conf.matchHeaders).forEach(([header, value]) => {
          interceptor.matchHeader(header, value);
        });
      }

      const key = `${conf.path} - ${conf.status}`;
      if (!trackedRequests[key]) {
        trackedRequests[key] = 0;
      }

      interceptor.log((x) => {
        if (x.endsWith('true')) {
          trackedRequests[key]++;
        }
      });
    });

    process.send({ mocked: true });
  }

  if (msg.getRequestCount) {
    const key = msg.getRequestCount.key;
    process.send({ requestCount: trackedRequests[key] });
  }
});

// setup mock time
process.on('message', (msg) => {
  if (msg.startTime) {
    clock = sinon.useFakeTimers({
      // override so we don't mock setImmediate
      toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'],
      now: msg.startTime,
    });
  } else if (msg.tick) {
    u.tickSync(clock, msg.tick)
    .then(() => {
      process.send({ ticked: true });
    });
  }
});

// allow blocking the heartbeat
process.on('message', (msg) => {
  if (msg.blockHeartbeat) {
    nock.disableNetConnect();
    process.send({ blocked: true });
  } else if (msg.unblockHeartbeat) {
    nock.enableNetConnect();
    process.send({ unblocked: true });
  }
});

// run the command file
let collector;
try {
  collector = require('../../../../refocus-collector'); // local testing
} catch (err) {
  collector = require('@salesforce/refocus-collector'); // travis
}

const cmd = process.argv[2];
const command = collector[cmd]();
if (command.then) {
  command.then(() => process.send({ started: true }));
} else {
  process.send({ started: true });
}
