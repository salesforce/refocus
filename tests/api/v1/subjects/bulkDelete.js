/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/bulkDelete.js
 */
'use strict';
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const testUtils = require('../../../testUtils');
const utils = require('./utils');
const constants = require('../../../../api/v1/constants');

describe('tests/api/v1/subjects/bulkDelete.js', () => {
  let token;
  const AUTHORIZATION = 'Authorization';
  const DELETE_PATH = '/v1/subjects/delete/bulk';

  before((done) => {
    testUtils.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
  });
  before(utils.populateRedis);
  after(utils.forceDelete);
  after(testUtils.forceDeleteUser);

  describe(`POST ${DELETE_PATH} >`, () => {
    it('Must be able delete when proper request', (done) => {
      api.post(DELETE_PATH)
        .set(AUTHORIZATION, token)
        .send([''])
        .expect(constants.httpStatus.OK)
        .end(done);
    });

    it('Must fail with invalid request body', (done) => {
      api.post(DELETE_PATH)
        .set(AUTHORIZATION, token)
        .send('INVALID object')
        .expect(constants.httpStatus.BAD_REQUEST)
        .end(done);
    });
  });

  describe('Checking status api', () => {
    it('Must be able to retrieve the status with valid request', (done) => {
      api.get('/v1/subjects/bulk/1/status')
        .set(AUTHORIZATION, token)
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.status).to.equal(constants.httpStatus.OK);
          expect(res.body.status).to.equal('OK');
          return done();
        });
    });

    it('Must fail when invalid job id', (done) => {
      api.get('/v1/subjects/bulk/blah/status')
        .set(AUTHORIZATION, token)
        .expect(constants.httpStatus.BAD_REQUEST)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.errors).is.not.empty;
          return done();
        });
    });
  });
});
