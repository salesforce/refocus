/**
 * tests/realtime/setupSocketIO.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../testUtils');
const socketIOSetup = require('../../realtime/setupSocketIO');
const express = require('express');
const app = express();
const httpServer = require('http').Server(app);
const io = require('socket.io')(httpServer);
const u = require('./utils');

describe('socket io namespace setup Tests:', () => {
  const rootSubjNAUS = 'NA.US';
  const rootSubjNA = 'NA';
  let createdLensId;
  before((done) => {
    u.doSetup()
    .then((createdLens) => {
      createdLensId = createdLens.id;
    })
    .then(() => tu.db.Perspective.create({
      name: `${tu.namePrefix}firstPersp`,
      lensId: createdLensId,
      rootSubject: rootSubjNAUS,
    }))
    .then(() => tu.db.Perspective.create({
      name: `${tu.namePrefix}secondPersp`,
      lensId: createdLensId,
      rootSubject: rootSubjNA,
      aspectFilter: ['temperature', 'humidity'],
      aspectTagFilter: ['temp', 'hum'],
      subjectTagFilter: ['ea', 'na'],
      statusFilter: ['OK'],
    }))
    .then(() => done())
    .catch((err) => done(err));
  });

  after(u.forceDelete);

  it('socketio nsp object must be initialized with namespaces', (done) => {
    socketIOSetup.setupNamespace(io)
    .then((sio) => {
      // setupNamespace should return a socketio io object
      expect(sio.nsps).to.be.an('object');
      // the returned socketio object must contain the initialized namespace
      expect(sio.nsps).to.contain.all.keys(['/',
        `/${rootSubjNAUS}&INCLUDE&INCLUDE&INCLUDE&INCLUDE`]);
      done();
    })
    .catch((err) => done(err));
  });

  it('socketio nsp object must be initialized with namespace even if' +
        'the filters are set', (done) => {
    socketIOSetup.setupNamespace(io)
    .then((sio) => {
      // setupNamespace should return a socketio io object
      expect(sio.nsps).to.be.an('object');
      // the returned socketio object must contain the initialized namespace
      expect(sio.nsps).to.have.all.keys(['/',
        `/${rootSubjNAUS}&INCLUDE&INCLUDE&INCLUDE&INCLUDE`,
        `/${rootSubjNA}&INCLUDE=temperature;humidity&INCLUDE=ea;na&INCLUDE=` +
        'temp;hum&INCLUDE=OK']);
      done();
    })
    .catch((err) => done(err));
  });
});
