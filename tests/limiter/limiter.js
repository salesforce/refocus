/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/limiter/limiter.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../index').app);
const constants = require('../../api/v1/constants');
const tu = require('../testUtils');
const u = require('./utils');
const path = '/v1/aspects';
const Aspect = tu.db.Aspect;
const expect = require('chai').expect;

describe('tests/limiter/limiter.js >', () => {
  let token;
  let token2;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      return tu.createSecondUser();
    })
    .then((u2) => tu.createTokenFromUserName(u2.name))
    .then((tok2) => {
      token2 = tok2;
      done();
    })
    .catch(done);
  });
  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('(a) OK, under limit', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({ name: tu.namePrefix + 'Limiter', timeout: '1m' })
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      expect(res.headers['x-ratelimit-limit']).to.equal('2');
      expect(res.headers['x-ratelimit-remaining']).to.equal('1');
    })
    .end(done);
  });

  it('(b) OK, still under limit', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({ name: tu.namePrefix + 'Limiter2', timeout: '1m' })
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      expect(res.headers['x-ratelimit-limit']).to.equal('2');
      expect(res.headers['x-ratelimit-remaining']).to.equal('0');
    })
    .end(done);
  });

  it('(c) OK, different user', (done) => {
    api.post(path)
    .set('Authorization', token2)
    .send({ name: tu.namePrefix + 'Limiter3', timeout: '1m' })
    .expect(constants.httpStatus.CREATED)
    .expect((res) => {
      expect(res.headers['x-ratelimit-limit']).to.equal('2');
      expect(res.headers['x-ratelimit-remaining']).to.equal('1');
    })
    .end(done);
  });

  it('(d) First user, 429', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send({ name: tu.namePrefix + 'Limiter4', timeout: '1m' })
    .expect(constants.httpStatus.TOO_MANY_REQUESTS)
    .expect((res) => {
      expect(res.headers['x-ratelimit-limit']).to.equal('2');
      expect(res.headers['x-ratelimit-remaining']).to.equal('0');
    })
    .end(done);
  });
});
