/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/lenses/postWithCreatedBy.js
 */
'use strict'; // eslint-disable-line strict

const featureToggles = require('feature-toggles');
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/lenses';
const expect = require('chai').expect;
const ZERO = 0;

describe(`api: POST with createdBy ${path}`, () => {
  let token;

  before((done) => {
    tu.toggleOverride('returnCreatedBy', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('returnCreatedBy', false));

  it('if token provided, createdBy and user fields are returned', (done) => {
    api.post(path)
    .set('Authorization', token)
    .field('name', 'testLens')
    .field('description', 'test description')
    .attach('library', 'tests/api/v1/apiTestsUtils/lens.zip')
    .expect(constants.httpStatus.CREATED)
    .end((err, res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.createdBy).to.be.an('string');
      expect(res.body.user).to.be.an('object');
      expect(res.body.user.name).to.be.an('string');
      done();
    });
  });

   it('if token is NOT provided, createdBy and user fields are NOT' +
    ' returned', (done) => {
    api.post(path)
    .field('name', 'testLens')
    .field('description', 'test description')
    .attach('library', 'tests/api/v1/apiTestsUtils/lens.zip')
    .expect(constants.httpStatus.CREATED)
    .end((err, res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.createdBy).to.be.undefined;
      expect(res.body.user).to.be.undefined;
      done();
    });
  });
});
