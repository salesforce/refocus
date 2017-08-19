/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/index/v1index.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const path = '/v1';
const expect = require('chai').expect;

describe('tests/api/v1/index/v1index.js >', () => {
  describe(`${path} >`, () => {
    let token;

    before((done) => {
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    after(tu.forceDeleteUser);

    it('/v1 redirects to /v1/docs', (done) => {
      api.get(path)
      .expect((res) => expect(res.redirect).to.be.true)
      .expect((res) => {
        expect(res.header.location).to.contain('/docs');
      })
      .end(done);
    });

    it('/v1/docs serves swagger UI', (done) => {
      api.get('/v1/docs/')
      .expect(constants.httpStatus.OK)
      .expect(/Swagger UI/)
      .end(done);
    });

    it('No POST', (done) => {
      api.post(path)
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end(done);
    });

    it('No PUT', (done) => {
      api.put(path)
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end(done);
    });

    it('No PATCH', (done) => {
      api.patch(path)
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end(done);
    });

    it('No DELETE', (done) => {
      api.delete(path)
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end(done);
    });
  });

  describe('/ >', () => {
    it('/ should redirect to /perspectives', (done) => {
      api.get('/')
      .expect((res) => expect(res.redirect).to.be.true)
      .expect((res) => expect(res.header.location).to.contain('/perspectives'))
      .end(done);
    });
  });
});
