/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/globalconfig/get.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/globalconfig';
const expect = require('chai').expect;

describe('tests/api/v1/globalconfig/get.js >', () => {
  let token;
  const uname = `${tu.namePrefix}test@test.com`;
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

  /**
   * Register a non-admin user and an admin user; grab the predefined admin
   * user's token
   */
  before((done) => {
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
        key: `${tu.namePrefix}_GLOBAL_CONFIG_ABC`,
        value: 'def',
      })
      .expect(constants.httpStatus.CREATED)
      .end(done);
    });
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('sucessful get by non-admin user with different case', (done) => {
    const config = tu.namePrefix + '_GLOBAL_CONFIG_ABC';
    api.get(path + '/' + config.toLowerCase())
    .set('Authorization', testUserToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.key).to.equal(config);
      done();
    });
  });

  it('sucessful get by non-admin user', (done) => {
    api.get(`${path}/${tu.namePrefix}_GLOBAL_CONFIG_ABC`)
    .set('Authorization', testUserToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.property('key',
        `${tu.namePrefix}_GLOBAL_CONFIG_ABC`);
      expect(res.body).to.have.property('value', 'def');
      done();
    });
  });

  it('sucessful get by predefined admin user', (done) => {
    api.get(`${path}/${tu.namePrefix}_GLOBAL_CONFIG_ABC`)
    .set('Authorization', predefinedAdminUserToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.property('key',
        `${tu.namePrefix}_GLOBAL_CONFIG_ABC`);
      expect(res.body).to.have.property('value', 'def');
      done();
    });
  });
});
