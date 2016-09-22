/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./tests/sockets/index.js
 *
 * Tests interaction between server socket.io and client sockets
*/

const expect = require('chai').expect;
const setupRedis = require('../../setupRedis');

// socket.io client setup
const config = require('../../config');
const PORT = config.port;
const io = require('socket.io-client');
const options ={
  transports: ['websocket'],
  'force new connection': true
};
const socketURL = 'http://localhost:' + PORT;

const sinon = require('sinon');
const EventEmitter = require('events').EventEmitter;
const CHANNEL_NAME = config.redis.channelName;
const SUBJECT_ADD = 'refocus.internal.realtime.subject.add';

const subject = {name: 'achoo'};
const obj = {};
obj[SUBJECT_ADD] = subject;

function makeMockSub() {
  const spy = sinon.spy();
  const mockSub = new EventEmitter;
  mockSub.on('message', spy);

  return mockSub;
}

describe('Socket.io tests', () => {

  // setup http server with express
  const express = require('express');
  const app = express();
  const httpServer = require('http').Server(app);
  const serverIO = require('socket.io')(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`);
  });

  it('with multiple clients, each client should receive one message ' +
    'per broadcast', (done) => {

    // pass in real server-side socket.io and mock sub to setupRedis
    const mockSub = makeMockSub();
    setupRedis(serverIO, mockSub);

    const client_1 = io.connect(socketURL, options);
    const object = { method: function () {} };
    const spy = sinon.spy(object, "method");
    var count = 0;

    function checkMessage(client) {
      client.on(SUBJECT_ADD, (mssgStr) => {
        spy.withArgs(client.id);
        object.method(client.id);
        expect(spy.withArgs(client.id).callCount).to.equal(1);

        count++;
        if (count == 2) {
          client_1.disconnect();
          client_2.disconnect();
          done();
        }
      });
    }

    client_1.on('connect', () => {
      client_2 = io.connect(socketURL, options);

      client_2.on('connect', () => {

        // emit message after both clients connect
        mockSub.emit('message', CHANNEL_NAME, JSON.stringify(obj));
        checkMessage(client_2);
        checkMessage(client_1);
      });
    });
  });

  it('Should broadcast SUBJECT_ADD to new user after user connect', (done) => {

    // pass in real server-side socket.io and mock sub to setupRedis
    const mockSub = makeMockSub();
    setupRedis(serverIO, mockSub);

    const client = io.connect(socketURL, options);

    // sub emits message after client connects
    client.on('connect', () => {
      mockSub.emit('message', CHANNEL_NAME, JSON.stringify(obj));
    });

    client.on(SUBJECT_ADD, (mssgStr) => {
      expect(mssgStr).to.be.a('string');
      const receivedObj = JSON.parse(mssgStr)[SUBJECT_ADD];
      expect(JSON.stringify(subject)).to.equal(JSON.stringify(receivedObj));

      client.disconnect();
      done();
    });
  });

  it('when multiple clients, socket.io broadcast to the expected ' +
    'number of sockets', (done) => {

    const mockSub = makeMockSub();
    setupRedis(serverIO, mockSub);

    const client_1 = io.connect(socketURL, options);

    function checkNumberOfClientSockets (client) {
      client.on(SUBJECT_ADD, (mssgStr) => {
        expect(Object.keys(serverIO.sockets.sockets).length).to.equal(2);

          client_1.disconnect();
          client_2.disconnect();
          done();
      });
    }

    client_1.on('connect', () => {
      client_2 = io.connect(socketURL, options);

      client_2.on('connect', () => {
        mockSub.emit('message', CHANNEL_NAME, JSON.stringify(obj));
        checkNumberOfClientSockets(client_2, 2);
      });
    });
  });
});
