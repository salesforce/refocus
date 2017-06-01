/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/postWithCreatedBy.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const adminUser = require('../../../../config').db.adminUser;
const jwtUtil = require('../../../../utils/jwtUtil');
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const path = '/v1/subjects';
const expect = require('chai').expect;
const ZERO = 0;
const tokenPath = '/v1/tokens';

describe(`api: POST with createdBy when token is NOT enforced ${path}`, () => {
  let token;
  let user;
  const n2b = { name: `${tu.namePrefix}Quebec` };
  const predefinedAdminUserToken = jwtUtil.createToken(
    adminUser.name, adminUser.name
  );

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
    .send({ name: n2b.name })
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        done(err);
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
    .send({ name: n2b.name })
    .expect(constants.httpStatus.CREATED)
    .end((err, res ) => {
      if (err) {
        done(err);
      }

      expect(res.body.createdBy).to.be.undefined;
      expect(res.body.user).to.be.undefined;
      done();
    });
  });

  it('on invalid token, createdBy and user fields are NOT' +
    ' returned', (done) => {
    api.post(path)
    .set('Authorization', 'iDontExist')
    .send({ name: n2b.name })
    .expect(constants.httpStatus.CREATED)
    .end((err, res ) => {
      if (err) {
        done(err);
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
      .end((err2, res2) => {
        if (err2 || res2.body.errors) {
          return done(err2);
        }

        api.post(path)
        .set('Authorization', token)
        .send({ name: n2b.name })
        .expect(constants.httpStatus.CREATED)
        .end((err, res) => {
          if (err) {
            done(err);
          }

          expect(res.body.createdBy).to.equal(user.id);
          expect(res.body.user.name).to.equal(user.name);
          expect(res.body.user.email).to.equal(user.email);
          done();
        });
      });
    });
  });
});
