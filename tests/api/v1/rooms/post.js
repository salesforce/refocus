/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/rooms/post.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const path = '/v1/rooms';
const expect = require('chai').expect;
const ZERO = 0;
const tu = require('../../../testUtils');

describe('tests/api/v1/rooms/post.js >', () => {
  let token;
  let testRoomType;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    tu.db.RoomType.create(u.rtSchema)
    .then((newRoomType) => {
      testRoomType = newRoomType;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteToken);

  it('Pass, post room', (done) => {
    let room = u.getStandard();
    room.type = testRoomType.id;

    api.post(`${path}`)
    .set('Authorization', token)
    .send(room)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(u.name);
      done();
    });
  });

  it('Fail, duplicate room', (done) => {
    let room = u.getStandard();
    room.type = testRoomType.id;
    tu.db.Room.create(room)
    .then(() => {
      api.post(`${path}`)
      .set('Authorization', token)
      .send(room)
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

  it('Fail, room validation incorrect', (done) => {
    let room = u.getStandard();
    room.type = testRoomType.id;
    room.active = 'INVALID_VALUE';
    api.post(`${path}`)
    .set('Authorization', token)
    .send(room)
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
