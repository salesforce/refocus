/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 *tests/api/v1/ipfilter/whitelistLocalhost.js
 */
'use strict';

process.env.NODE_ENV = 'testWhitelistLocalhost';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const path = '/v1/api-docs';

describe('Ip Restriction Test', () => {
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  after(tu.forceDeleteUser);

  it(`GET OK for localhost at ${path}`, (done) => {
    api.get(path)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});

