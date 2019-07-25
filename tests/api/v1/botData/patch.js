/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/botData/patch.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../express').app);
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

describe('tests/api/v1/botData/patch.js >', () => {
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

  it('Pass, patch botData name', (done) => {
    const newName = 'newName';
    api.patch(`${path}/${saveBotData.id}`)
    .set('Authorization', token)
    .send({ name: newName })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(newName);
      done();
    });
  });

  it('Pass, patch botData value', (done) => {
    const values = 'newValue';
    api.patch(`${path}/${saveBotData.id}`)
    .set('Authorization', token)
    .send({ value: values })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.value).to.equal(values);
      done();
    });
  });

  it('Fail, patch botData invalid name', (done) => {
    const newName = '~!invalidName';
    api.patch(`${path}/${saveBotData.id}`)
    .set('Authorization', token)
    .send({ name: newName })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[ZERO].type)
      .to.contain(tu.schemaValidationErrorName);
      done();
    });
  });

  it('Fail, patch botData name already there', (done) => {
    testBotData.name = 'newName';
    const newName = testBotData.name;
    BotData.create(testBotData)
    .then(() => {
      api.patch(`${path}/${saveBotData.id}`)
      .set('Authorization', token)
      .send({ name: newName })
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[ZERO].message).contains('must be unique');
        done();
      });
    })
    .catch(done);
  });

  it('Fail, patch botData invalid attribute', (done) => {
    api.patch(`${path}/${saveBotData.id}`)
    .set('Authorization', token)
    .send({ invalid: true })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).not.to.have.property('invalid');
      done();
    });
  });
});
