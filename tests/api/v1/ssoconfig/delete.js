/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/ssoconfig/delete.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const adminUser = require('../../../../config').db.adminUser;
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/ssoconfig';
const jwtUtil = require('../../../../utils/jwtUtil');
const ZERO = 0;
const ONE = 1;

describe(`api: DELETE ${path}`, () => {
  let token;
  const uname = `${tu.namePrefix}test@test.com`;
  const predefinedAdminUserToken = jwtUtil.createToken(
    adminUser.name, adminUser.name
  );
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
    u.createSSOConfig()
    .then(() => done())
    .catch(done);
  });

  before((done) => {
    u.newGenericUser(token, (err, t) => {
      if (err) {
        return done(err);
      }

      testUserToken = t;
      done();
    });
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('forbidden if not admin user', (done) => {
    api.delete(path)
    .set('Authorization', testUserToken)
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

  it('delete ok by admin user', (done) => {
    api.delete(path)
    .set('Authorization', predefinedAdminUserToken)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body.samlEntryPoint).to.equal(u.samlParams.samlEntryPoint);
      expect(res.body.isDeleted).to.not.equal(0);
    })
    .end(done);
  });
});
