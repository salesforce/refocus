/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/collector/integration.js
 */
'use strict'; // eslint-disable-line strict
const nock = require('nock');
const sinon = require('sinon');
const u = require('./forkUtils');
let clock;

// set up mock data
const mockResponse = {
  sub1: {
    asp1: '1',
    asp2: '2',
  },
  sub2: {
    asp1: '3',
    asp2: '4',
  },
};

// mock the data source for the collector
const dataSourceUrl = 'http://www.example.com';
nock(dataSourceUrl)
.persist()
.get('/')
.reply(200, mockResponse, { 'Content-Type': 'application/json' });

// setup mock time
process.on('message', (msg) => {
  if (msg.startTime) {
    clock = sinon.useFakeTimers(msg.startTime);
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
  } else if (msg.unblockHeartbeat) {
    nock.enableNetConnect();
  }
});

// run the command file
const cmd = process.argv[2];
const path = `../../../../refocus-collector/src/commands/refocus-collector-${cmd}`;
const command = require(path);
if (command.then) {
  command.then(() => process.send({ started: true }));
} else {
  process.send({ started: true });
}
