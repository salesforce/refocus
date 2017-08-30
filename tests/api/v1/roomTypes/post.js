/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/roomTypes/post.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const path = '/v1/roomTypes';
const expect = require('chai').expect;
const ZERO = 0;
const tu = require('../../../testUtils');
const bu = require('../bots/utils');

describe(`tests/api/v1/roomTypes/post.js >`, () => {
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
    })
    .then(() => {
      bu.createStandard();
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteToken);
  after(bu.forceDelete);

  it('Pass, post roomType', (done) => {
    api.post(`${path}`)
    .set('Authorization', token)
    .send(u.getStandard())
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(u.name);
      done();
    });
  });

  it('Pass, post roomType with a valid Bot', (done) => {
    const roomtype = u.getStandard();
    roomtype.bots = [bu.name];
    api.post(`${path}`)
    .set('Authorization', token)
    .send(roomtype)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(u.name);
      expect(res.body.bots.length).to.equal(1);
      expect(res.body.bots[0]).to.equal(bu.name);
      done();
    });
  });

  it('Fail, duplicate roomType', (done) => {
    u.createStandard()
    .then(() => {
      api.post(`${path}`)
      .set('Authorization', token)
      .send(u.getStandard())
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[ZERO].type)
        .to.contain('SequelizeUniqueConstraintError');
        done();
      });
    })
    .catch(done);
  });

  it('Fail, roomType validation incorrect', (done) => {
    let testRoomType = u.getStandard();
    testRoomType.settings = 'INVALID_VALUE';

    api.post(`${path}`)
    .set('Authorization', token)
    .send(testRoomType)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[ZERO].type)
      .to.contain('SCHEMA_VALIDATION_FAILED');
      done();
    });
  });

  it('Fail, bot does not exist', (done) => {
    const roomtype = u.getStandard();
    roomtype.bots = [bu.name + 'a'];
    api.post(`${path}`)
    .set('Authorization', token)
    .send(roomtype)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[ZERO].type)
      .to.contain('ResourceNotFoundError');
      done();
    });
  });

  it('Fail, duplicate bots not allowed', (done) => {
    const roomtype = u.getStandard();
    roomtype.bots = [bu.name, bu.name];
    api.post(`${path}`)
    .set('Authorization', token)
    .send(roomtype)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[ZERO].type)
      .to.contain('DuplicateBotError');
      done();
    });
  });
});
