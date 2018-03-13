/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/botActions/get.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const r = require('../rooms/utils');
const rt = require('../roomTypes/utils');
const b = require('../bots/utils');
const Room = tu.db.Room;
const RoomType = tu.db.RoomType;
const Bot = tu.db.Bot;
const BotAction = tu.db.BotAction;
const path = '/v1/botActions';
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;
const TWO = 2;

describe('tests/api/v1/botActions/get.js >', () => {
  let testBotAction;
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
      return BotAction.create(testBotAction);
    })
    .then((botAction) => {
      testBotAction = botAction;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteToken);

  it('Fail, get array of one', (done) => {
    api.get(`${path}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      done(err);
    });
  });

  it('Pass, get array of multiple', (done) => {
    const respondedAction = u.getResponse();
    respondedAction.botId = testBotAction.botId;
    respondedAction.roomId = testBotAction.roomId;
    BotAction.create(respondedAction)
    .then(() => {
      api.get(`${path}?botId=${testBotAction.botId}`)
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

  it('Pass, get active', (done) => {
    api.get(`${path}?isPending=true&botId=${testBotAction.botId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(ONE);
      done(err);
    });
  });

  it('Pass, get inactive', (done) => {
    api.get(`${path}?isPending=false&botId=${testBotAction.botId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(ZERO);
      done(err);
    });
  });

  it('Pass, get by botId', (done) => {
    api.get(`${path}?botId=${testBotAction.botId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(ONE);
      done();
    });
  });

  it('Fail, get by botId', (done) => {
    api.get(`${path}?botId=NOT_FOUND`)
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(() => done());
  });

  it('Fail, get by roomId no bot Id', (done) => {
    api.get(`${path}?roomId=${testBotAction.roomId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      done();
    });
  });

  it('Fail, get by roomId', (done) => {
    api.get(`${path}?roomId=NOT_FOUND`)
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(() => done());
  });

  it('Pass, get by roomId and botId', (done) => {
    api.get(`${path}?roomId=${testBotAction.roomId}&botId=${testBotAction.botId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(ONE);
      done();
    });
  });

  it('Pass, get by name', (done) => {
    api.get(`${path}?botId=${testBotAction.botId}&name=${u.name}`)
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
  });

  it('Pass, get by id', (done) => {
    api.get(`${path}/${testBotAction.id}`)
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
    .end(done);
  });
});
