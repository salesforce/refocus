/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/routeFlag/flagEnabled.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../express').app);
const constants = require('../../api/v1/constants');
const path = '/v1/aspects';
const expect = require('chai').expect;
const tu = require('../testUtils');

describe('path is not found', () => {
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  after(tu.forceDeleteToken);

  it('GET is found', (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});
