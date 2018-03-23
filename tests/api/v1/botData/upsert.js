/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/botData/upsert.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const path = '/v1/botData/upsert';
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

describe('tests/api/v1/botData/upsert.js >', () => {
  let testBotData;
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
    testBotData = u.getStandard();
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
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('Pass, create new botData', (done) => {
    api.post(`${path}`)
    .set('Authorization', token)
    .send(testBotData)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.value).to.equal(testBotData.value);
      return done();
    });
  });

  it('Pass, update botData string', (done) => {
    BotData.create(testBotData)
    .then(() => {
      testBotData.value = 'newValue';
      api.post(`${path}`)
      .set('Authorization', token)
      .send(testBotData)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.value).to.equal('newValue');
        return done();
      });
    })
    .catch(done);
  });

  it('Pass, update botData json', (done) => {
    testBotData.value = '{\"test\":\"Test1\"}';
    BotData.create(testBotData)
    .then(() => {
      testBotData.value = '{\"test\":\"Test2\"}';
      api.post(`${path}`)
      .set('Authorization', token)
      .send(testBotData)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.value).to.equal('{\"test\":\"Test2\"}');
        return done();
      });
    })
    .catch(done);
  });

  it('Pass, append botData json', (done) => {
    testBotData.value = '{ \"test\": \"Test1\" }';
    BotData.create(testBotData)
    .then(() => {
      testBotData.value = '{ \"test2\": \"Test2\" }';
      api.post(`${path}`)
      .set('Authorization', token)
      .send(testBotData)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.value).to
        .equal('{\"test\":\"Test1\",\"test2\":\"Test2\"}');
        return done();
      });
    })
    .catch(done);
  });

  it('Pass, repalce string botData with json', (done) => {
    BotData.create(testBotData)
    .then(() => {
      testBotData.value = '{ \"test\": \"Test1\" }';
      api.post(`${path}`)
      .set('Authorization', token)
      .send(testBotData)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.value).to.equal('{ \"test\": \"Test1\" }');
        return done();
      });
    })
    .catch(done);
  });

  it('Pass, repalce json botData with string', (done) => {
    testBotData.value = '{ \"test\": \"Test1\" }';
    BotData.create(testBotData)
    .then(() => {
      testBotData.value = 'Test1';
      api.post(`${path}`)
      .set('Authorization', token)
      .send(testBotData)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.value).to.equal('Test1');
        return done();
      });
    })
    .catch(done);
  });

  it('Fail, botData with invalid name', (done) => {
    testBotData.name = '~!invalidName';
    api.post(`${path}`)
    .set('Authorization', token)
    .send(testBotData)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[ZERO].type)
      .to.contain(tu.schemaValidationErrorName);
      return done();
    });
  });
});
