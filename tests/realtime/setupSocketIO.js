/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

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

describe('socket.io setup', () => {
  describe('with logging disabled', () => {
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
        aspectFilterType: 'INCLUDE',
        aspectTagFilter: ['temp', 'hum'],
        aspectTagFilterType: 'INCLUDE',
        subjectTagFilter: ['ea', 'na'],
        subjectTagFilterType: 'INCLUDE',
        statusFilter: ['OK'],
        statusFilterType: 'INCLUDE'
      }))
      .then(() => done())
      .catch(done);
    });

    after(u.forceDelete);

    // Skipping this for now, now that init requires session in cookie
    it.skip('socketio nsp object must be initialized with namespaces', (done) => {
      socketIOSetup.init(io)
      .then((sio) => {
        // init should return a socketio io object
        expect(sio.nsps).to.be.an('object');

        // the returned socketio object must contain the initialized namespace
        expect(sio.nsps).to.contain.all.keys([
          '/',
          `/${rootSubjNAUS}&EXCLUDE&EXCLUDE&EXCLUDE&EXCLUDE`,
        ]);
        done();
      })
      .catch(done);
    });

    // Skipping this for now, now that init requires session in cookie
    it.skip('socketio nsp object must be initialized with namespace even if' +
          'the filters are set', (done) => {
      socketIOSetup.init(io)
      .then((sio) => {
        // init should return a socketio io object
        expect(sio.nsps).to.be.an('object');

        // the returned socketio object must contain the initialized namespace
        expect(sio.nsps).to.have.all.keys([
          '/',
          `/${rootSubjNAUS}&EXCLUDE&EXCLUDE&EXCLUDE&EXCLUDE`,
          `/${rootSubjNA}&INCLUDE=temperature;humidity&INCLUDE=ea;na&INCLUDE=` +
            'temp;hum&INCLUDE=OK',
        ]);
        done();
      })
      .catch(done);
    });
  }); // with logging disabled

  describe('with logging enabled', () => {
    const rootSubjNAUS = 'NA.US';
    const rootSubjNA = 'NA';
    let createdLensId;
    before((done) => {
      tu.toggleOverride('enableRealtimeActivityLogs', true);
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
        aspectFilterType: 'INCLUDE',
        aspectTagFilter: ['temp', 'hum'],
        aspectTagFilterType: 'INCLUDE',
        subjectTagFilter: ['ea', 'na'],
        subjectTagFilterType: 'INCLUDE',
        statusFilter: ['OK'],
        statusFilterType: 'INCLUDE'
      }))
      .then(() => done())
      .catch(done);
    });

    after(u.forceDelete);
    after(() => tu.toggleOverride('enableRealtimeActivityLogs', true));

    // Skipping this for now, now that init requires session in cookie
    it.skip('socketio nsp object must be initialized with namespaces', (done) => {
      socketIOSetup.init(io)
      .then((sio) => {
        // init should return a socketio io object
        expect(sio.nsps).to.be.an('object');

        // the returned socketio object must contain the initialized namespace
        expect(sio.nsps).to.contain.all.keys([
          '/',
          `/${rootSubjNAUS}&EXCLUDE&EXCLUDE&EXCLUDE&EXCLUDE`,
        ]);
        done();
      })
      .catch(done);
    });

    // Skipping this for now, now that init requires session in cookie
    it.skip('socketio nsp object must be initialized with namespace even if' +
          'the filters are set', (done) => {
      socketIOSetup.init(io)
      .then((sio) => {
        // init should return a socketio io object
        expect(sio.nsps).to.be.an('object');

        // the returned socketio object must contain the initialized namespace
        expect(sio.nsps).to.have.all.keys([
          '/',
          `/${rootSubjNAUS}&EXCLUDE&EXCLUDE&EXCLUDE&EXCLUDE`,
          `/${rootSubjNA}&INCLUDE=temperature;humidity&INCLUDE=ea;na&INCLUDE=` +
            'temp;hum&INCLUDE=OK',
        ]);
        done();
      })
      .catch(done);
    });
  }); // with logging enabled
});
