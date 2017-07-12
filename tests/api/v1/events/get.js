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
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const tu = require('../../../testUtils');

describe(`api: GET ${path}`, () => {
  let testEvent;
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
    u.createStandard()
    .then((newEvent) => {
      testEvent = newEvent;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  afterEach(tu.forceDeleteUser);

  describe('GET event', () => {
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
      u.createStandard2()
      .then(() => done())
      .catch(done);

      api.get(`${path}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.length).to.equal(TWO);
      });
    });

    it('Pass, get by botId', (done) => {
      u.createStandard2()
      .then(() => {
        u.createStandard3();
      })
      .then(() => done())
      .catch(done);
      console.log(testEvent);
      api.get(`${path}?botId=`+testEvent.botId)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.length).to.equal(TWO);
      });
    });

    it('Pass, get by roomId', (done) => {
      u.createStandard2()
      .then(() => {
        u.createStandard3();
      })
      .then(() => done())
      .catch(done);
      api.get(`${path}?roomId=`+testEvent.roomId)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.length).to.equal(TWO);
      });
    });

    it('Pass, get by roomId and botId', (done) => {
      u.createStandard2()
      .then(() => {
        u.createStandard3();
      })
      .then(() => done())
      .catch(done);
      api.get(`${path}?roomId=`+testEvent.roomId+'&botId='+testEvent.botId)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.length).to.equal(ONE);
      });
    });

    it('Pass, get by id', (done) => {
      api.get(`${path}/${testEvent.id}`)
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

