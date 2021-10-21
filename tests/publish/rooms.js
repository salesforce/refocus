/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/publish/rooms.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const supertest = require('supertest');
const redis = require('redis');
const rconf = require('../../config/redisConfig');
const constants = require('../../api/v1/constants');
const api = supertest(require('../../express').app);
const tu = require('../testUtils');
const Room = tu.db.Room;
const RoomType = tu.db.RoomType;
const u = require('../api/v1/rooms/utils');
const roomEvents = require('../../realtime/constants').events.room;
const path = '/v1/rooms';
const DEFAULT_LOCAL_REDIS_URL = '//127.0.0.1:6379';

describe('tests/publish/rooms.js >', () => {
  let token;
  let subscriber;
  let subscribeTracker = [];
  let testRoomType;

  before((done) => {
    subscriber = redis.createClient(rconf.instanceUrl.queue);
    subscriber.subscribe(rconf.botChannelName);
    subscriber.on('message', (channel, msg) => subscribeTracker.push(msg));

    tu.createToken()
      .then((returnedToken) => (token = returnedToken))
      .then(() => done())
      .catch(done);
  });

  beforeEach((done) => {
    tu.db.RoomType.create(u.rtSchema)
      .then((newRoomType) => {
        testRoomType = newRoomType;
        done();
      })
      .catch(done);
  });

  afterEach(u.forceDelete);
  afterEach(() => subscribeTracker = []);

  after(tu.forceDeleteToken);

  describe('POST >', () => {
    it('POST active room', (done) => {
      let room = u.getStandard();
      room.type = testRoomType.id;

      api.post(`${path}`)
        .set('Authorization', token)
        .send(room)
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(roomEvents.add);
          const evtBody = evt[roomEvents.add];
          expect(evtBody).to.include.keys('new', 'old');
          expect(evtBody.old).to.include.keys('id', 'name', 'active', 'origin',
            'type', 'ownerId', 'createdBy', 'updatedAt', 'createdAt', 'settings',
            'bots', 'externalId', 'pubOpts');
          expect(evtBody.new).to.include.keys('id', 'name', 'active', 'origin',
            'type', 'ownerId', 'createdBy', 'updatedAt', 'createdAt', 'settings',
            'bots', 'externalId', 'pubOpts');
          expect(evtBody.new).to.have.property('name', '___TestRoom');
          expect(evtBody.new).to.have.property('active', true);
          done();
        });
    });

    // TODO ask IMC if this is a valid test, i.e. should we even be emitting an event here?
    it('POST inactive room', (done) => {
      const room = u.getStandard();
      room.type = testRoomType.id;
      room.active = false;

      api.post(`${path}`)
        .set('Authorization', token)
        .send(room)
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(subscribeTracker).to.have.length(1);
          const evt = JSON.parse(subscribeTracker[0]);
          expect(evt).to.have.property(roomEvents.add);
          const evtBody = evt[roomEvents.add];
          expect(evtBody).to.include.keys('new', 'old');
          expect(evtBody.old).to.include.keys('id', 'name', 'active', 'origin',
            'type', 'ownerId', 'createdBy', 'updatedAt', 'createdAt', 'settings',
            'bots', 'externalId', 'pubOpts');
          expect(evtBody.new).to.include.keys('id', 'name', 'active', 'origin',
            'type', 'ownerId', 'createdBy', 'updatedAt', 'createdAt', 'settings',
            'bots', 'externalId', 'pubOpts');
          expect(evtBody.new).to.have.property('name', '___TestRoom');
          expect(evtBody.new).to.have.property('active', false);
          done();
        });
    });
  });

  describe('PATCH >', () => {
    let rm;

    beforeEach((done) => {
      const room = u.getStandard();
      room.type = testRoomType.id;
      Room.create(room)
        .then((newRoom) => {
          rm = newRoom;
          subscribeTracker = [];
          done();
        })
        .catch(done);
    });

    // Ran into this when trying to implement these tests:
    //   Unhandled rejection SequelizeEagerLoadingError:
    //   RoomType is associated to Room using an alias. You've included an
    //   alias (type), but it does not match the alias(es) defined in your
    //   association (RoomType).

    it('modify settings of active room, get settingsChanged event');
    it('modify name of active room, get settingsChanged event');
    it('modify active false>>true, get settingsChanged event');
    it('modify active true>>false, get settingsChanged event');
    it('no event if origin is modified');
    it('no event if type is modified');
    it('no event if bots is modified');
    it('no event if externalId is modified');

    // TODO ask IMC if we should be emitting events for changes to settings/name for an inactive room
    it('modify name of inactive room, get settingsChanged event?');
    it('modify settings of inactive room, get settingsChanged event?');
  });

  describe('DELETE >', () => {
    let rm;

    beforeEach((done) => {
      const room = u.getStandard();
      room.type = testRoomType.id;
      Room.create(room)
        .then((newRoom) => {
          rm = newRoom;
          subscribeTracker = [];
          done();
        })
        .catch(done);
    });

    // Ran into this when trying to implement these tests:
    //   Unhandled rejection SequelizeEagerLoadingError:
    //   RoomType is associated to Room using an alias. You've included an
    //   alias (type), but it does not match the alias(es) defined in your
    //   association (RoomType).
    it('got settingsChanged event if room was active');
    it('no event if room was inactive');
  });
});
