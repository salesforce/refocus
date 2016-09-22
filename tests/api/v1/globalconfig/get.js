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
const adminUser = require('../../../../config').db.adminUser;
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/globalconfig';
const expect = require('chai').expect;

describe(`api: GET ${path}`, () => {
  let testUserToken;
  let predefinedAdminUserToken;
  let token;

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
  before((done) => {
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
        api.post('/v1/token')
        .send({
          username: adminUser.name,
          email: adminUser.name,
          password: adminUser.password,
        })
        .end((err2, res2) => {
          if (err2) {
            done(err2);
          } else {
            predefinedAdminUserToken = res2.body.token;
            api.post(path)
            .set('Authorization', predefinedAdminUserToken)
            .send({
              key: `${tu.namePrefix}_GLOBAL_CONFIG_ABC`,
              value: 'def',
            })
            .expect(constants.httpStatus.CREATED)
            .end((err3, res3) => {
              done();
            });
          }
        });
      }
    });
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('sucessful get by non-admin user', (done) => {
    api.get(`${path}/${tu.namePrefix}_GLOBAL_CONFIG_ABC`)
    .set('Authorization', testUserToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
        expect(res.body).to.have.property('key',
          `${tu.namePrefix}_GLOBAL_CONFIG_ABC`);
        expect(res.body).to.have.property('value', 'def');
          done();
      }
    });
  });

  it('sucessful get by predefined admin user', (done) => {
    api.get(`${path}/${tu.namePrefix}_GLOBAL_CONFIG_ABC`)
    .set('Authorization', predefinedAdminUserToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      expect(res.body).to.have.property('key',
        `${tu.namePrefix}_GLOBAL_CONFIG_ABC`);
      expect(res.body).to.have.property('value', 'def');
      done();
    });
  });
});
