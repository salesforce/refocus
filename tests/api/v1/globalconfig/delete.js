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
const adminUser = require('../../../../config').db.adminUser;
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/globalconfig';
const expect = require('chai').expect;
const jwtUtil = require('../../../../utils/jwtUtil');

describe(`api: DELETE ${path}`, () => {
  let testUserToken;
  let token;
  const predefinedAdminUserToken = jwtUtil.createToken(
    adminUser.name, adminUser.name
  );

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  /**
   * Register a non-admin user and an admin user; grab the predefined admin
   * user's token
   */
  beforeEach((done) => {
    api.post('/v1/register')
    .set('Authorization', token)
    .send({
      username: `${tu.namePrefix}test@test.com`,
      email: `${tu.namePrefix}test@test.com`,
      password: 'abcdefghijklmnopqrstuvwxyz',
    })
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
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
          } else {
            done();
          }
        });
      }
    });
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('forbidden if not admin user', (done) => {
    api.delete(`${path}/${tu.namePrefix}_GLOBAL_CONFIG_ABC`)
    .set('Authorization', testUserToken)
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
        expect(res.body.errors).to.have.length(1);
        expect(res.body.errors).to.have.deep.property('[0].type',
          'ForbiddenError');
        done();
      }
    });
  });

  it('sucessful delete by predefined admin user', (done) => {
    api.delete(`${path}/${tu.namePrefix}_GLOBAL_CONFIG_ABC`)
    .set('Authorization', predefinedAdminUserToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
        expect(res.body).to.have.property('key',
          `${tu.namePrefix}_GLOBAL_CONFIG_ABC`);
        expect(res.body).to.have.property('value', 'def');
        expect(res.body.isDeleted).to.be.greaterThan(0);
        done();
      }
    });
  });
});
