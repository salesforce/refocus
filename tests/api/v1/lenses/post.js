/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/lenses/post.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/lenses';
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

  describe('post duplicate fails', () => {
    beforeEach((done) => {
      u.doSetup()
      .then(() => done())
      .catch(done);
    });

    it('with identical name', (done) => {
      api.post(path)
      .set('Authorization', token)
      .field('name', u.name)
      .attach('library', 'tests/api/v1/apiTestsUtils/lens.zip')
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.errors[ZERO].type)
          .to.equal(tu.uniErrorName);
        done();
      });
    });

    it('with case different name', (done) => {
      api.post(path)
      .set('Authorization', token)
      .field('name', u.name)
      .attach('library', 'tests/api/v1/apiTestsUtils/lens.zip')
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.errors[ZERO].type)
          .to.equal(tu.uniErrorName);
        done();
      });
    });
  });

  it('OK', (done) => {
    api.post(path)
    .set('Authorization', token)
    .field('name', 'testLens')
    .field('description', 'test description')
    .attach('library', 'tests/api/v1/apiTestsUtils/lens.zip')
    .expect(constants.httpStatus.CREATED)
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('Error if required files not present in zip', (done) => {
    api.post(path)
    .set('Authorization', token)
    .field('name', 'testLens')
    .field('description', 'test description')
    .attach('library', 'tests/api/v1/lenses/lensZips/missing_json_lens.zip')
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.errors[0].description).contains(
        'lens.js and lens.json are required files in lens zip'
      );
      done();
    });
  });

  it('Error if library is not zip file', (done) => {
    api.post(path)
    .set('Authorization', token)
    .attach('library', 'tests/api/v1/lenses/lensZips/lens.json')
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.errors[0].description).contains(
        'The library parameter mime type should be application/zip'
      );
      done();
    });
  });

  it('Error if name not present in lens json', (done) => {
    api.post(path)
    .set('Authorization', token)
    .field('description', 'test description')
    .field('name', 'testLens')
    .attach('library', 'tests/api/v1/lenses/lensZips/lensNoName.zip')
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.errors[0].description).contains(
        'name is required in lens json'
      );
      done();
    });
  });

  it('name is equal to sourceName if name not present in form data', (done) => {
    api.post(path)
    .set('Authorization', token)
    .field('description', 'test description')
    .attach('library', 'tests/api/v1/apiTestsUtils/lens.zip')
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.name).to.equal(res.body.sourceName);
      done();
    });
  });
});
