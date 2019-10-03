/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/publish/botData.js
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
const Bot = tu.db.Bot;
const botDataEvents = require('../../realtime/constants').events.botData;
const path = '/v1/botData';
const u = require('../api/v1/botData/utils');
const r = require('../api/v1/rooms/utils');
const rt = require('../api/v1/roomTypes/utils');
const b = require('../api/v1/bots/utils');
const DEFAULT_LOCAL_REDIS_URL = '//127.0.0.1:6379';

describe('tests/publish/botData.js >', () => {
  let token;
  let subscriber;
  let subscribeTracker = [];
  const testBotData = u.getStandard();
  let userId;

  before((done) => {
    subscriber = redis.createClient(DEFAULT_LOCAL_REDIS_URL);
    subscriber.subscribe(rconf.botChannelName);
    subscriber.on('message', (channel, msg) => subscribeTracker.push(msg));

    tu.createUserAndToken()
      .then((obj) => {
        userId = obj.user.id;
        token = obj.token;
      })
      .then(() => done())
      .catch(done);
  });

  beforeEach((done) => {
    RoomType.create(rt.getStandard())
      .then((roomType) => {
        const room = r.getStandard();
        room.type = roomType.id;
        return Room.create(room);
      })
      .then((room) => {
        testBotData.roomId = room.id;
        return b.createStandard(userId);
      })
      .then((bot) => {
        testBotData.botId = bot.id;
        subscribeTracker = [];
        done();
      })
      .catch(done);
  });

  afterEach(u.forceDelete);
  afterEach(() => subscribeTracker = []);

  after(tu.forceDeleteToken);
  after(tu.forceDeleteUser);

  it('POST then PATCH then DELETE, subscriber gets events', (done) => {
    api.post(path)
      .set('Authorization', token)
      .send(testBotData)
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(subscribeTracker).to.have.length(1);
        const evt = JSON.parse(subscribeTracker[0]);
        expect(evt).to.have.property(botDataEvents.add);
        const evtBody = evt[botDataEvents.add];
        expect(evtBody).to.include.keys('new', 'old');
        expect(evtBody.old).to.include.keys('id', 'name', 'value', 'roomId',
          'botId', 'ownerId', 'createdBy', 'updatedAt', 'createdAt', 'pubOpts');
        expect(evtBody.new).to.include.keys('id', 'name', 'value', 'roomId',
          'botId', 'ownerId', 'createdBy', 'updatedAt', 'createdAt', 'pubOpts');
        expect(evtBody.new).to.have.property('name', '___TestBotData');
        expect(evtBody.new).to.have.property('value', 'String1');
        subscribeTracker = [];

        api.patch(`${path}/${evtBody.new.id}`)
          .set('Authorization', token)
          .send({ name: 'NewName'})
          .expect(constants.httpStatus.OK)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(subscribeTracker).to.have.length(1);
            const evt = JSON.parse(subscribeTracker[0]);
            expect(evt).to.have.property(botDataEvents.upd);
            const evtBody = evt[botDataEvents.upd];
            expect(evtBody).to.include.keys('new', 'old');
            expect(evtBody.old).to.include.keys('id', 'name', 'value',
              'createdAt', 'updatedAt', 'roomId', 'botId', 'ownerId',
              'createdBy', 'user', 'owner', 'pubOpts');
            expect(evtBody.new).to.include.keys('id', 'name', 'value',
              'createdAt', 'updatedAt', 'roomId', 'botId', 'ownerId',
              'createdBy', 'user', 'owner', 'pubOpts');
            expect(evtBody.new).to.have.property('name', 'NewName');
            subscribeTracker = [];

            api.delete(`${path}/${evtBody.new.id}`)
              .set('Authorization', token)
              .send()
              .expect(constants.httpStatus.OK)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                expect(subscribeTracker).to.have.length(1);
                const evt = JSON.parse(subscribeTracker[0]);
                expect(evt).to.have.property(botDataEvents.del);
                const evtBody = evt[botDataEvents.del];
                expect(evtBody).to.include.keys('new', 'old');
                expect(evtBody.old).to.include.keys('id', 'name', 'value',
                  'createdAt', 'updatedAt', 'roomId', 'botId', 'ownerId',
                  'createdBy', 'user', 'owner', 'pubOpts');
                expect(evtBody.new).to.include.keys('id', 'name', 'value',
                  'createdAt', 'updatedAt', 'roomId', 'botId', 'ownerId',
                  'createdBy', 'user', 'owner', 'pubOpts');
                expect(evtBody.new).to.have.property('name', 'NewName');

                done();
              });
          });
      });
  });
});
