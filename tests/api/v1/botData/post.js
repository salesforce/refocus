/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/botData/post.js
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

describe('tests/api/v1/botData/post.js >', () => {
  const testBotData = u.getStandard();
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
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('Pass, post botData', (done) => {
    api.post(`${path}`)
    .set('Authorization', token)
    .send(testBotData)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(u.name);
      done();
    });
  });

  it('Pass, post large botData', (done) => {
    testBotData.value =
      'yeDqFOAvhPjCBpZ67YdoNZZRRQFFQjbsf0yNVtxjKHe7C25FYX' +
      'e6DAyMVA7Y2RQ5Q6vJrYrufPLcQKy7ZYWycI01IZa4bv23Abxf' +
      'MlXkFmAOx51wV7Hg3yVeNYVMkoTLxPu8bmlCUnSLvVxD9a7j5g' +
      '60EZwhh3m3MlqXnXq5qPdhGfysaKjAKpA3EnRQAxmFI3vd0GbM' +
      'aHLPF33ZcYpsDz35tixhDc3tAm4AHh4Wu3LjTQlgWV9vuFUAmE' +
      'UHIFfrkE3LmadNGzPgzebGPQvsgMshHqnecaRp42OR6LYivS3Q';
    api.post(`${path}`)
    .set('Authorization', token)
    .send(testBotData)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(u.name);
      done();
    });
  });

  it('Fail, duplicate botData', (done) => {
    BotData.create(testBotData)
    .then(() => {
      api.post(`${path}`)
      .set('Authorization', token)
      .send(testBotData)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[ZERO].type)
        .to.contain('ValidationError');
        done();
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
      done();
    });
  });
});
