/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/globalconfig/patch.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/globalconfig';
const expect = require('chai').expect;

describe('tests/api/v1/globalconfig/patch.js >', () => {
  let token;
  const uname = `${tu.namePrefix}test@test.com`;
  let testUserToken = '';
  const predefinedAdminUserToken = tu.createAdminToken();
  const GLOBAL_CONFIG = tu.namePrefix + '_GLOBAL_CONFIG_ABC';

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  /**
   * Register a non-admin user and an admin user; grab the predefined admin
   * user's token
   */
  beforeEach((done) => {
    api.post('/v1/register')
    .set('Authorization', token)
    .send({
      username: uname,
      email: uname,
      password: 'abcdefghijklmnopqrstuvwxyz',
    })
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      testUserToken = res.body.token;

      api.post(path)
      .set('Authorization', predefinedAdminUserToken)
      .send({
        key: GLOBAL_CONFIG,
        value: 'def',
      })
      .expect(constants.httpStatus.CREATED)
      .end(done);
    });
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('forbidden if not admin user', (done) => {
    api.patch(path + '/' + GLOBAL_CONFIG)
    .set('Authorization', testUserToken)
    .send({ value: 'updating' })
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors).to.have.length(1);
      expect(res.body.errors)
      .to.have.deep.property('[0].type', 'ForbiddenError');
      done();
    });
  });

  it('sucessful patch by predefined admin user', (done) => {
    api.patch(path + '/' + GLOBAL_CONFIG)
    .set('Authorization', predefinedAdminUserToken)
    .send({ value: 'updated!' })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.key).to.equal(GLOBAL_CONFIG);
      expect(res.body.value).to.equal('updated!');
      done();
    });
  });

  it('sucessful patch by predefined user with different case', (done) => {
    const updatedConfig = GLOBAL_CONFIG.toLowerCase();
    api.patch(path + '/' + GLOBAL_CONFIG)
    .set('Authorization', predefinedAdminUserToken)
    .send({ key: updatedConfig })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.key).to.equal(updatedConfig);
      done();
    });
  });
});
