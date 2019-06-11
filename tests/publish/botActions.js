/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/publish/botActions.js
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
const BotAction = tu.db.BotAction;
const botActionEvents = require('../../realtime/constants').events.botAction;
const path = '/v1/botActions';
const u = require('../api/v1/botActions/utils');
const r = require('../api/v1/rooms/utils');
const rt = require('../api/v1/roomTypes/utils');
const b = require('../api/v1/bots/utils');
const DEFAULT_LOCAL_REDIS_URL = '//127.0.0.1:6379';

describe('tests/publish/botActions.js >', () => {
  let token;
  let subscriber;
  let subscribeTracker = [];
  let testBotAction;

  before((done) => {
    subscriber = redis.createClient(DEFAULT_LOCAL_REDIS_URL);
    subscriber.subscribe(rconf.botChannelName);
    subscriber.on('message', (channel, msg) => subscribeTracker.push(msg));

    tu.createToken()
      .then((returnedToken) => (token = returnedToken))
      .then(() => done())
      .catch(done);
  });

  beforeEach((done) => {
    testBotAction = u.getStandard();
    RoomType.create(rt.getStandard())
      .then((roomType) => {
        const room = r.getStandard();
        room.type = roomType.id;
        return Room.create(room);
      })
      .then((room) => {
        testBotAction.roomId = room.id;
        return Bot.create(b.getStandard());
      })
      .then((bot) => {
        testBotAction.botId = bot.id;
        subscribeTracker = [];
        done();
      })
      .catch(done);
  });

  afterEach(u.forceDelete);

  after(tu.forceDeleteToken);

  afterEach(() => subscribeTracker = []);

  it('POST then PATCH then DELETE, subscriber gets events', (done) => {
    api.post(path)
      .set('Authorization', token)
      .send(testBotAction)
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(subscribeTracker).to.have.length(1);
        const evt = JSON.parse(subscribeTracker[0]);
        expect(evt).to.have.property(botActionEvents.add);
        const evtBody = evt[botActionEvents.add];
        expect(evtBody).to.include.keys('new', 'old');
        expect(evtBody.old).to.include.keys('id', 'isPending', 'name',
          'parameters', 'roomId', 'botId', 'ownerId', 'updatedAt',
          'createdAt', 'actionLog', 'response', 'userId', 'pubOpts');
        expect(evtBody.new).to.include.keys('id', 'isPending', 'name',
          'parameters', 'roomId', 'botId', 'ownerId', 'updatedAt',
          'createdAt', 'actionLog', 'response', 'userId', 'pubOpts');
        expect(evtBody.new).to.have.property('name', 'Action1');
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
            expect(evt).to.have.property(botActionEvents.upd);
            const evtBody = evt[botActionEvents.upd];
            expect(evtBody).to.include.keys('id', 'isPending', 'name',
              'actionLog', 'parameters', 'response', 'createdAt',
              'updatedAt', 'roomId', 'botId', 'ownerId', 'userId', 'User',
              'owner', 'pubOpts');
            expect(evtBody).to.have.property('name', 'NewName');
            subscribeTracker = [];

            api.delete(`${path}/${evtBody.id}`)
              .set('Authorization', token)
              .send()
              .expect(constants.httpStatus.OK)
              .end((err, res) => {
                if (err) {
                  return done(err);
                }

                expect(subscribeTracker).to.have.length(1);
                const evt = JSON.parse(subscribeTracker[0]);
                expect(evt).to.have.property(botActionEvents.del);
                const evtBody = evt[botActionEvents.del];
                console.log(evtBody)
                expect(evtBody).to.include.keys('id', 'isPending', 'name',
                  'actionLog', 'parameters', 'response', 'createdAt',
                  'updatedAt', 'roomId', 'botId', 'ownerId', 'userId', 'User',
                  'owner', 'pubOpts');
                expect(evtBody).to.have.property('name', 'NewName');

                done();
              });
          });
      });
  });
});
