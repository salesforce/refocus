/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/enforceToken/collector/post.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../index').app);
const constants = require('../../../api/v1/constants');
const tu = require('../../testUtils');
const u = require('../../api/v1/collectors/utils');
const path = '/v1/collectors';
const Collector = tu.db.Collector;
const expect = require('chai').expect;
const ZERO = 0;

describe(`api: POST ${path}`, () => {
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

  it('OK: collector token not valid when collector is not found' +
    ' in the database', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(u.toCreate)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const deRegisterPath = `/v1/collectors/${res.body.id}/deregister`;
      return Collector.destroy({
        where: {},
        truncate: true
      })
      .then(() => {
        api.post(deRegisterPath)
        .set('Authorization', res.body.token)
        .expect(constants.httpStatus.FORBIDDEN)
        .end((_err, _res) => {
          if (_err) {
            return done(_err);
          }

          expect(_res.body.errors[ZERO].description).to.equal('Invalid Token.');
          return done();
        });
      });
    });
  });

  it('OK: validate collector token returned in post response ' +
    'should work', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(u.toCreate)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const deRegisterPath = `/v1/collectors/${res.body.id}/deregister`;
      return api.post(deRegisterPath)
        .set('Authorization', res.body.token)
        .send({})
        .expect(constants.httpStatus.OK)
        .end((_err, _res) => {
          if (_err) {
            return done(_err);
          }

          expect(_res.body.registered).to.equal(false);
          return done();
        });
    });
  });
});
