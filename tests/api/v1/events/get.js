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
const DEFAULT_LIMIT = 100;
const TOTAL_EVENTS = 150;
const PRE_BUILT_EVENTS = 3;

describe('tests/api/v1/events/get.js >', () => {
  let testEvent = u.getStandard();
  let testEventOutput;
  let testEvent2 = u.getStandard();
  testEvent2.log = 'Sample Event 2';
  let testEvent3 = u.getStandard();
  testEvent3.log = 'Sample Event 3';
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
    .then(() => Event.create(testEvent2))
    .then(() => Event.create(testEvent3))
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteToken);

  it('Pass, get array of multiple', (done) => {
    api.get(`${path}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(THREE);
      done();
    });
  });

  it('Pass, hit default limit', (done) => {
    testEvent = u.getStandard();
    const arrayofPromises = [];
    for (let i = 0; i < TOTAL_EVENTS - PRE_BUILT_EVENTS; i++) {
      arrayofPromises.push(Event.create(testEvent));
    }

    Promise.all(arrayofPromises)
    .then((events) => {
      api.get(`${path}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.length).to.equal(DEFAULT_LIMIT);
        done();
      });
    });
  });

  it('Pass, offset events', (done) => {
    testEvent = u.getStandard();
    const arrayofPromises = [];
    for (let i = 0; i < TOTAL_EVENTS - PRE_BUILT_EVENTS; i++) {
      arrayofPromises.push(Event.create(testEvent));
    }

    Promise.all(arrayofPromises)
    .then((events) => {
      api.get(`${path}?offset=${DEFAULT_LIMIT}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.length).to.equal(TOTAL_EVENTS - DEFAULT_LIMIT);
        done();
      });
    });
  });

  it('Pass, set limit', (done) => {
    testEvent = u.getStandard();
    const arrayofPromises = [];
    for (let i = 0; i < TOTAL_EVENTS - PRE_BUILT_EVENTS; i++) {
      arrayofPromises.push(Event.create(testEvent));
    }

    Promise.all(arrayofPromises)
    .then((events) => {
      api.get(`${path}?limit=${TOTAL_EVENTS}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.length).to.equal(TOTAL_EVENTS);
        done();
      });
    });
  });

  it('Pass, events should be sorted by createdAt', (done) => {
    api.get(`${path}?sort=-createdAt`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body[0].log).to.equal(testEvent3.log);
      expect(res.body[1].log).to.equal(testEvent2.log);
      expect(res.body[2].log).to.equal(testEvent.log);
      done();
    });
  });

  it('Pass, get by botId', (done) => {
    api.get(`${path}?botId=${testEvent.botId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(TWO);
      done();
    });
  });

  it('Pass, get by roomId', (done) => {
    api.get(`${path}?roomId=${testEvent.roomId}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.length).to.equal(TWO);
      done();
    });
  });

  it('Pass, get by roomId and botId', (done) => {
    api.get(`${path}?roomId=${testEvent.roomId}&botId=${testEvent.botId}`)
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

  it('Pass, get by id', (done) => {
    api.get(`${path}/${testEventOutput.id}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.log).to.equal(u.log);
      done();
    });
  });

  it('Fail, id not found', (done) => {
    api.get(`${path}/INVALID_ID`)
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(() => done());
  });
});
