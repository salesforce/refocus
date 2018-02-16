/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/tokens/delete.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/tokens';
const expect = require('chai').expect;
const regPath = '/v1/register';
const tokenPath = '/v1/tokens';

describe(`tests/api/v1/tokens/delete.js, DELETE ${path} >`, () => {
  /* user uname has 2 tokens: Voldemort and Tom
   user with unameOther has 1 token: Dumbledore */
  const uname = `${tu.namePrefix}test@refocus.com`;
  const tname1 = `${tu.namePrefix}Voldemort`;
  const tname2 = `${tu.namePrefix}Tom`;
  const predefinedAdminUserToken = tu.createAdminToken();
  let userToken = '';
  let tid1;
  let tid2;

  before((done) => {
    // create user __test@refocus.com
    api.post(regPath)
    .send({
      email: uname,
      password: 'fakePasswd',
      username: uname,
    })
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      userToken = res.body.token;

      // create token ___Voldemort
      api.post(tokenPath)
      .set('Authorization', userToken)
      .send({ name: tname1 })
      .end((err1, res1) => {
        if (err1) {
          return done(err1);
        }

        tid1 = res1.body.id;

        // create token ___Tom
        api.post(tokenPath)
        .set('Authorization', userToken)
        .send({ name: tname2 })
        .end((err2, res2) => {
          if (err2) {
            return done(err2);
          }

          tid2 = res2.body.id;
          done();
        });
      });
    });
  });

  after(u.forceDelete);

  it('admin user, token found, delete ok', (done) => {
    api.delete(`${path}/${tid1}`)
    .set('Authorization', predefinedAdminUserToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.property('name', `${tu.namePrefix}Voldemort`);
      done();
    });
  });

  it('admin user, token not found', (done) => {
    api.delete(`${path}/123-abc`)
    .set('Authorization', predefinedAdminUserToken)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(done);
  });

  it('invalid token', (done) => {
    api.delete(`${path}/${tid2}`)
    .set('Authorization', '???')
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });

  it('non admin user can delete own token', (done) => {
    api.delete(`${path}/${tid2}`)
    .set('Authorization', userToken)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.property('name', `${tu.namePrefix}Tom`);
      done();
    });
  });
});
