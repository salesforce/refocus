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
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/ssoconfig';
const ONE = 1;

describe(`tests/api/v1/ssoconfig/post.js, POST ${path} >`, () => {
  let token;
  const predefinedAdminUserToken = tu.createAdminToken();
  let testUserToken = '';

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    u.newGenericUser(token, (err, t) => {
      if (err) {
        done(err);
      }

      testUserToken = t;
      done();
    });
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('forbidden if not admin user', (done) => {
    api.post(path)
    .set('Authorization', testUserToken)
    .send({
      samlEntryPoint: 'http://someOtherUrl.com',
      samlIssuer: u.samlParams.samlIssuer,
    })
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors).to.have.length(ONE);
      expect(res.body.errors).to.have.deep.property('[0].type',
        'ForbiddenError');
      done();
    });
  });

  it('sucessful creation', (done) => {
    api.post(path)
    .set('Authorization', predefinedAdminUserToken)
    .send(u.samlParams)
    .expect(constants.httpStatus.CREATED)
    .end(done);
  });

  it('Cannot post if there is already a config row in database', (done) => {
    api.post(path)
    .set('Authorization', predefinedAdminUserToken)
    .send(u.samlParams)
    .expect(constants.httpStatus.FORBIDDEN)
    .expect(/SSOConfigCreateConstraintError/)
    .end(done);
  });
});
