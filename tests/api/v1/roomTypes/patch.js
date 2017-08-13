/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/roomTypes/patch.js
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

describe(`api: PATCH ${path}`, () => {
  let testRoomType;
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
    .then((newRoomType) => {
      testRoomType = newRoomType;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteToken);

  describe('PATCH roomType', () => {
    it('Pass, patch roomType name', (done) => {
      const newName = 'newName';
      api.patch(`${path}/${testRoomType.id}`)
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

    it('Fail, patch roomType invalid name', (done) => {
      const newName = '~!invalidName';
      api.patch(`${path}/${testRoomType.id}`)
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

    it('Fail, patch roomType invalid attribute', (done) => {
      api.patch(`${path}/${testRoomType.id}`)
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
});

