/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/rooms/delete.js
 */

'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const path = '/v1/rooms';
const expect = require('chai').expect;
const tu = require('../../../testUtils');

describe(`api: DELETE ${path}`, () => {
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

  describe('DELETE room', () => {
    it('Pass, delete room', (done) => {
      api.delete(`${path}/${testRoom.id}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.name).to.equal(u.name);
        done(err);
      });
    });

    it('Fail, room not found', (done) => {
      api.delete(`${path}/-1`)
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end((err) => {
        done(err);
      });
    });
  });
});

