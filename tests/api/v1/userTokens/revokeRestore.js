/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/userTokens/revokeRestore.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/users';
const expect = require('chai').expect;
const registerPath = '/v1/register';
const tokenPath = '/v1/tokens';

describe('tests/api/v1/userTokens/revokeRestore.js, ' +
`POST ${path}/U/tokens/T/[revoke|restore] >`, () => {
  const predefinedAdminUserToken = tu.createAdminToken();
  const uname = `${tu.namePrefix}test@refocus.com`;
  const tname = `${tu.namePrefix}Voldemort`;
  let userId;
  let unameToken = '';

  before((done) => {
    // create user __test@refocus.com
    api.post(registerPath)
    .send({
      email: uname,
      password: 'fakePasswd',
      username: uname,
    })
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      userId = res.body.id;
      unameToken = res.body.token;

      // create token ___Voldemort
      api.post(tokenPath)
      .set('Authorization', unameToken)
      .send({ name: tname })
      .end(done);
    });
  });

  after(u.forceDelete);

  it('admin user, ok', (done) => {
    api.post(`${path}/${uname}/tokens/${tname}/revoke`)
    .set('Authorization', predefinedAdminUserToken)
    .send({})
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.property('name', tname);
      expect(res.body.isRevoked > '0').to.be.true;
      api.post(`${path}/${uname}/tokens/${tname}/restore`)
      .set('Authorization', predefinedAdminUserToken)
      .send({})
      .expect(constants.httpStatus.OK)
      .end((err2, res2) => {
        if (err2) {
          return done(err2);
        }

        expect(res2.body).to.have.property('name', tname);
        expect(res2.body).to.have.property('isRevoked', '0');
        done();
      });
    });
  });

  it('admin user, try to restore a token if it was not already revoked',
  (done) => {
    api.post(`${path}/${uname}/tokens/${tname}/restore`)
    .set('Authorization', predefinedAdminUserToken)
    .send({})
    .expect(constants.httpStatus.BAD_REQUEST)
    .end(done);
  });

  it('admin user, try to revoke a token if it was already revoked',
  (done) => {
    api.post(`${path}/${uname}/tokens/${tname}/revoke`)
    .set('Authorization', predefinedAdminUserToken)
    .send({})
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.property('name', tname);
      expect(res.body.isRevoked > '0').to.be.true;
      api.post(`${path}/${uname}/tokens/${tname}/revoke`)
      .set('Authorization', predefinedAdminUserToken)
      .send({})
      .expect(constants.httpStatus.BAD_REQUEST)
      .end(done);
    });
  });

  it('admin user, token to be restored not found', (done) => {
    api.post(`${path}/${uname}/tokens/foo/restore`)
    .set('Authorization', predefinedAdminUserToken)
    .send({})
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.be.equal('ResourceNotFoundError');
      done();
    });
  });

  it('admin user, token to be revoked not found', (done) => {
    api.post(`${path}/${uname}/tokens/foo/revoke`)
    .set('Authorization', predefinedAdminUserToken)
    .send({})
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].type).to.be.equal('ResourceNotFoundError');
      done();
    });
  });
});
