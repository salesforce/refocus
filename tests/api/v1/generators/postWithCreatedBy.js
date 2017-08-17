/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/generators/postWithCreatedBy.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const adminUser = require('../../../../config').db.adminUser;
const jwtUtil = require('../../../../utils/jwtUtil');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/generators';
const expect = require('chai').expect;
const tokenPath = '/v1/tokens';

describe('tests/api/v1/generators/postWithCreatedBy.js >', () => {
  let token;
  let user;
  const predefinedAdminUserToken = jwtUtil.createToken(
    adminUser.name, adminUser.name
  );
  const generatorToCreate = u.getGenerator();
  before((done) => {
    tu.toggleOverride('returnUser', true);
    tu.createUserAndToken()
    .then((obj) => {
      token = obj.token;
      user = obj.user;
      done();
    })
    .catch(done);
  });
  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('returnUser', false));

  it('if token provided, createdBy and user fields are returned', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send(generatorToCreate)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.createdBy).to.equal(user.id);
      expect(res.body.user.name).to.equal(user.name);
      expect(res.body.user.email).to.equal(user.email);
      done();
    });
  });

  it('if token is NOT provided, createdBy and user fields are NOT' +
    ' returned', (done) => {
    api.post(path)
    .send(generatorToCreate)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.createdBy).to.be.undefined;
      expect(res.body.user).to.be.undefined;
      done();
    });
  });

  it('on invalid token, createdBy and user fields are NOT' +
    ' returned', (done) => {
    api.post(path)
    .set('Authorization', 'iDoNotExist')
    .send(generatorToCreate)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.createdBy).to.be.undefined;
      expect(res.body.user).to.be.undefined;
      done();
    });
  });

  it('on revoked token, createdBy and user fields are returned', (done) => {
    api.post(tokenPath)
    .set('Authorization', token)
    .send({ name: 'newToken' })
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const newToken = res.body.token;
      return api.post(`${tokenPath}/${res.body.id}/revoke`)
      .set('Authorization', predefinedAdminUserToken)
      .send({ })
      .end((_err, _res) => {
        if (_err || _res.body.errors) {
          return done(_err);
        }

        return api.post(path)
          .set('Authorization', newToken)
          .send(generatorToCreate)
          .expect(constants.httpStatus.CREATED)
          .end((__err, __res) => {
            if (__err) {
              return done(__err);
            }

            expect(__res.body.createdBy).to.equal(user.id);
            expect(__res.body.user.name).to.equal(user.name);
            expect(__res.body.user.email).to.equal(user.email);
            return done();
          });
      });
    });
  });
});
