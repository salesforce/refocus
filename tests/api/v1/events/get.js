/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/events/get.js
 */

'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const path = '/v1/events';
const expect = require('chai').expect;
const THREE = 3;
const ONE = 1;
const TWO = 2;
const tu = require('../../../testUtils');
const Room = tu.db.Room;
const Event = tu.db.Event;
const b = require('../../../db/model/bot/utils');
const r = require('../../../db/model/room/utils');
const rt = require('../../../db/model/roomType/utils');

describe(`api: GET ${path}`, () => {
  let testEvent = u.getStandard();
  let testEventOutput;
  let testEvent2 = u.getStandard();
  let testEvent3 = u.getStandard();
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
    testEvent = u.getStandard();
    rt.createStandard()
    .then((roomType) => {
      const room = r.getStandard();
      room.type = roomType.id;
      return Room.create(room);
    })
    .then((room) => {
      testEvent.roomId = room.id;
      testEvent2.roomId = room.id;
      return b.createStandard();
    })
    .then((bot) => {
      testEvent.botId = bot.id;
      testEvent3.botId = bot.id;
      return Event.create(testEvent);
    })
    .then((event) => {
      testEventOutput = event;
    })
    .then(() => {
      return Event.create(testEvent2);
    })

    .then(() => {
      return Event.create(testEvent3);
    })
    .then(() => {
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteToken);

  describe('GET event', () => {
    it('Pass, get array of multiple', (done) => {
      api.get(`${path}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.length).to.equal(THREE);
        done();
      });
    });

    it('Pass, get by botId', (done) => {
      api.get(`${path}?botId=`+testEvent.botId)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.length).to.equal(TWO);
        done();
      });
    });

    it('Pass, get by roomId', (done) => {
      api.get(`${path}?roomId=`+testEvent.roomId)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.length).to.equal(TWO);
        done();
      });
    });

    it('Pass, get by roomId and botId', (done) => {
      api.get(`${path}?roomId=`+testEvent.roomId+'&botId='+testEvent.botId)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.length).to.equal(ONE);
        done();
      });
    });

    it('Pass, get by id', (done) => {
      api.get(`${path}/${testEventOutput.id}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.log).to.equal(u.log);
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

