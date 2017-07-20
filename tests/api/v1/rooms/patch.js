/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/rooms/patch.js
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

describe(`api: PATCH ${path}`, () => {
  let testRoom;
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
    .then((newRoom) => {
      testRoom = newRoom;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteToken);

  describe('PATCH room', () => {
    it('Pass, patch room name', (done) => {
      const newName = 'newName';
      api.patch(`${path}/${testRoom.id}`)
      .set('Authorization', token)
      .send({ name: newName })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.name).to.equal(newName);
        done();
      });
    });

    it('Fail, patch room invalid name', (done) => {
      const newName = '~!invalidName';
      api.patch(`${path}/${testRoom.id}`)
      .set('Authorization', token)
      .send({ name: newName })
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.errors[ZERO].type).to
        .contain('SequelizeValidationError');
        done();
      });
    });

    it('Fail, patch room invalid attribute', (done) => {
      api.patch(`${path}/${testRoom.id}`)
      .set('Authorization', token)
      .send({ invalid: true })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body).not.to.have.property('invalid');
        done();
      });
    });
  });
});

