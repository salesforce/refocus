/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/samples/postWithProvider.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;

describe('tests/api/v1/samples/postWithProvider.js >', () => {
  let sampleToPost;
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
    u.doSetup()
    .then(({ aspectId, subjectId }) => {
      sampleToPost = u.getBasic({ aspectId, subjectId });
      done();
    })
    .catch(done);
  });

  beforeEach(u.populateRedis);
  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('returnUser toggle on, provider and user fields returned', (done) => {
    const path = '/v1/samples';
    api.post(path)
    .set('Authorization', token)
    .send(sampleToPost)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.provider).to.be.an('string');
      expect(res.body.user).to.be.an('object');
      expect(res.body.user.name).to.be.an('string');
      expect(res.body.user.email).to.be.an('string');
      return done();
    });
  });
});
