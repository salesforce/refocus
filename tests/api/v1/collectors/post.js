/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/post.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const jwtUtil = require('../../../../utils/jwtUtil');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/collectors';
const expect = require('chai').expect;
const ZERO = 0;

describe('tests/api/v1/collectors/post.js >', () => {
  let token;
  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });
  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('OK: a collector token should also be returned', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(u.toCreate)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const collectortoken = jwtUtil
        .createToken(u.toCreate.name, u.toCreate.name);
      expect(res.body.registered).to.equal(true);
      expect(res.body.token).to.equal(collectortoken);
      return done();
    });
  });

  it('error - duplicate name', (done) => {
    const c2 = JSON.parse(JSON.stringify(u.toCreate));
    c2.name = c2.name.toUpperCase();
    api.post(path)
    .set('Authorization', token)
    .send(u.toCreate)
    .expect(constants.httpStatus.CREATED)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      return api.post(path)
        .set('Authorization', token)
        .send(c2)
        .expect(constants.httpStatus.FORBIDDEN)
        .end((_err, res) => {
          if (_err) {
            return done(_err);
          }

          expect(res.body.errors[ZERO].type)
          .to.equal(tu.uniErrorName);
          return done();
        });
    });
  });
});
