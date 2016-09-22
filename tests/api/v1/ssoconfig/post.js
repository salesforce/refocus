/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/ssoconfig/post.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/ssoconfig';

describe(`api: POST ${path}`, () => {
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('sucessful creation', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(u.samlParams)
    .expect(constants.httpStatus.CREATED)
    .end((err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('Cannot post if there is already a config row in database', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(u.samlParams)
    .expect(constants.httpStatus.FORBIDDEN)
    .expect(/SSOConfigCreateConstraintError/)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});
