/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/globalconfig/delete.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/globalconfig';
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;

describe('tests/api/v1/globalconfig/delete.js >', () => {
  let token;
  const uname = `${tu.namePrefix}test@test.com`;
  const predefinedAdminUserToken = tu.createAdminToken();
  let testUserToken = '';
  const config = tu.namePrefix + '_GLOBAL_CONFIG_ABC';

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
        key: `${tu.namePrefix}_GLOBAL_CONFIG_ABC`,
        value: 'def',
      })
      .expect(constants.httpStatus.CREATED)
      .end((err3 /* , res3*/) => {
        if (err3) {
          done(err3);
        }

        done();
      });
    });
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('forbidden if not admin user', (done) => {
    api.delete(path + '/' + config)
    .set('Authorization', testUserToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      if (err) {
        return done(err);
      } else {
        expect(res.body.errors).to.have.length(ONE);
        expect(res.body.errors).to.have.deep.property('[0].type',
          'ForbiddenError');
        done();
      }
    });
  });

  it('sucessful delete by predefined admin user with ' +
  'lowercase key', (done) => {
    api.delete(path + '/' + config.toLowerCase())
    .set('Authorization', predefinedAdminUserToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.key).to.equal(config);
      expect(res.body).to.have.property('value', 'def');
      expect(res.body.isDeleted).to.be.greaterThan(ZERO);
      done();
    });
  });

  it('sucessful delete by predefined admin user', (done) => {
    api.delete(path + '/' + config)
    .set('Authorization', predefinedAdminUserToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      } else {
        expect(res.body).to.have.property('key',
          `${tu.namePrefix}_GLOBAL_CONFIG_ABC`);
        expect(res.body).to.have.property('value', 'def');
        expect(res.body.isDeleted).to.be.greaterThan(ZERO);
        done();
      }
    });
  });
});
