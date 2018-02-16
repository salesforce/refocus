/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/profiles/delete.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const ZERO = 0;
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/profiles';
const Profile = tu.db.Profile;
const expect = require('chai').expect;

describe('tests/api/v1/profiles/delete.js >', () => {
  const predefinedAdminUserToken = tu.createAdminToken();
  let token;
  const p0 = { name: `${tu.namePrefix}1` };

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Profile.create(p0)
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('Pass, delete profile', (done) => {
    api.delete(`${path}/${p0.name}`)
    .set('Authorization', predefinedAdminUserToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(p0.name);
      done();
    });
  });

  it('fail, not an admin profile', (done) => {
    api.delete(`${path}/${p0.name}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[ZERO].type).to.equal('ForbiddenError');
      done();
    });
  });

  it('Fail, profile not found', (done) => {
    api.delete(`${path}/INVALID_PROFILE`)
    .set('Authorization', predefinedAdminUserToken)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});
