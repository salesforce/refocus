/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/botData/get.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const path = '/v1/botData';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const r = require('../rooms/utils');
const rt = require('../roomTypes/utils');
const b = require('../bots/utils');
const Room = tu.db.Room;
const RoomType = tu.db.RoomType;
const Bot = tu.db.Bot;
const BotData = tu.db.BotData;
const ZERO = 0;
const ONE = 1;
const TWO = 2;

describe('tests/api/v1/botData/get.js >', () => {
  const testBotData = u.getStandard();
  let saveBotData;
  let saveRoomType;
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    RoomType.create(rt.getStandard())
    .then((roomType) => {
      saveRoomType = roomType;
      const room = r.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((room) => {
      testBotData.roomId = room.id;
      return Bot.create(b.getStandard());
    })
    .then((bot) => {
      testBotData.botId = bot.id;
      return BotData.create(testBotData);
    })
    .then((botData) => {
      saveBotData = botData;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('Pass, get array of one', (done) => {
    api.get(`${path}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(ONE);
      expect(res.body[ZERO].name).to.equal(u.name);
      done(err);
    });
  });

  it('Pass, get array of multiple', (done) => {
    const testBotData2 = u.getStandard();
    testBotData2.name = 'TestData2';
    testBotData2.botId = testBotData.botId;
    testBotData2.roomId = testBotData.roomId;
    BotData.create(testBotData2)
    .then(() => {
      api.get(`${path}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.length).to.equal(TWO);
        done();
      });
    })
    .catch(done);
  });

  it('Pass, get by name', (done) => {
    const testBotData2 = u.getStandard();
    testBotData2.name = 'TestData2';
    testBotData2.botId = testBotData.botId;
    testBotData2.roomId = testBotData.roomId;
    BotData.create(testBotData2)
    .then(() => {
      api.get(`${path}?name=${u.name}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.length).to.equal(ONE);
        expect(res.body[ZERO].name).to.equal(u.name);
        done();
      });
    })
    .catch(done);
  });

  it('Pass, get data by room', (done) => {
    const testBotData2 = u.getStandard();
    const room = r.getStandard();
    room.name = 'NewRoomName';
    room.type = saveRoomType.id;
    Room.create(room)
    .then((newRoom) => {
      testBotData2.name = 'TestData2';
      testBotData2.botId = testBotData.botId;
      testBotData2.roomId = newRoom.id;
      return BotData.create(testBotData2);
    })
    .then(() => {
      api.get(`/v1/rooms/${testBotData.roomId}/data`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.length).to.equal(ONE);
        expect(res.body[ZERO].name).to.equal(u.name);
        done();
      });
    })
    .catch(done);
  });

  it('Pass, get data by room and bot Id', (done) => {
    const testBotData2 = u.getStandard();
    const bot = b.getStandard();
    bot.name = 'NewBot';
    Bot.create(bot)
    .then((newBot) => {
      testBotData2.name = 'TestData2';
      testBotData2.botId = newBot.id;
      testBotData2.roomId = testBotData.id;
      return BotData.create(testBotData2);
    })
    .then(() => {
      api.get(
        `/v1/rooms/${testBotData.roomId}/bots/${testBotData.botId}/data`
      )
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.length).to.equal(ONE);
        expect(res.body[ZERO].name).to.equal(u.name);
        done();
      });
    })
    .catch(done);
  });

  it('Pass, get data by room and bot name', (done) => {
    const testBotData2 = u.getStandard();
    const bot = b.getStandard();
    bot.name = 'NewBot';
    Bot.create(bot)
    .then((newBot) => {
      testBotData2.name = 'TestData2';
      testBotData2.botId = newBot.id;
      testBotData2.roomId = testBotData.id;
      return BotData.create(testBotData2);
    })
    .then(() => {
      api.get(
        `/v1/rooms/${testBotData.roomId}/bots/${bot.name}/data`
      )
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.length).to.equal(ONE);
        expect(res.body[ZERO].name).to.equal(u.name);
        done();
      });
    })
    .catch(done);
  });

  it('Pass, get by id', (done) => {
    api.get(`${path}/${saveBotData.id}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(u.name);
      done();
    });
  });

  it('Fail, id not found', (done) => {
    api.get(`${path}/INVALID_ID`)
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(() => done());
  });

  it('Fail, get data by a room that does not exist', (done) => {
    const testBotData2 = u.getStandard();
    const bot = b.getStandard();
    bot.name = 'NewBot';
    Bot.create(bot)
    .then((newBot) => {
      testBotData2.name = 'TestData2';
      testBotData2.botId = newBot.id;
      testBotData2.roomId = testBotData.id;
      return BotData.create(testBotData2);
    })
    .then(() => {
      api.get('/v1/rooms/NOT_FOUND/bots/NOT_FOUND/data')
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end(() => done());
    })
    .catch(done);
  });

  it('Fail, get data by a room with a bot that does not exist', (done) => {
    const testBotData2 = u.getStandard();
    const bot = b.getStandard();
    bot.name = 'NewBot';
    Bot.create(bot)
    .then((newBot) => {
      testBotData2.name = 'TestData2';
      testBotData2.botId = newBot.id;
      testBotData2.roomId = testBotData.id;
      return BotData.create(testBotData2);
    })
    .then(() => {
      api.get(`/v1/rooms/${testBotData.roomId}/bots/NOT_FOUND/data`)
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end(() => done());
    })
    .catch(done);
  });
});
