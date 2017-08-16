/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/ipfilter/blockAllhosts.js
 */
'use strict';
process.env.NODE_ENV = 'testBlockAllhosts';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const path = '/v1';

describe.skip('Ip Restriction Tests', () => {
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

  it(`GET UNAUTHORIZED for localhost at ${path}`, (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.UNAUTHORIZED)
    .end(done);
  });

  it('GET UNAUTHORIZED for localhost at /', (done) => {
    api.get('/')
    .set('Authorization', token)
    .expect(constants.httpStatus.UNAUTHORIZED)
    .end(done);
  });
});
