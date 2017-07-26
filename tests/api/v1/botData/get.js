/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/bots/get.js
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

describe(`api: GET ${path}`, () => {
  const testBotData = u.getStandard();
  let saveBotData;
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

  describe('GET bot', () => {
    it('Pass, get array of one', (done) => {
      api.get(`${path}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.length).to.equal(ONE);
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
            done(err);
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
        api.get(`${path}?name=`+u.name)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            done(err);
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
          done(err);
        }

        expect(res.body.name).to.equal(u.name);
        done();
      });
    });

    it('Fail, id not found', (done) => {
      api.get(`${path}/INVALID_ID`)
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end(() => {
        done();
      });
    });
  });
});

