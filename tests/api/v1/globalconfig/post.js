/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/globalconfig/post.js
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

describe('tests/api/v1/globalconfig/post.js >', () => {
  let token;
  const key = `${tu.namePrefix}_GLOBAL_CONFIG_ABC`;
  const predefinedAdminUserToken = tu.createAdminToken();
  const uname = `${tu.namePrefix}test@test.com`;
  let testUserToken = '';

  /**
   * Register a non-admin user and an admin user; grab the predefined admin
   * user's token
   */
  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
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
        done();
      });
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  describe('post duplicate fails >', () => {
    const DUMMY = {
      key: `${tu.namePrefix}_DUMMY_KEY`,
    };

    beforeEach((done) => {
      tu.db.GlobalConfig.create(DUMMY)
      .then(() => done())
      .catch(done);
    });

    afterEach(u.forceDelete);

    it('with identical name', (done) => {
      api.post(path)
      .set('Authorization', predefinedAdminUserToken)
      .send(DUMMY)
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[ZERO].type)
          .to.equal(tu.uniErrorName);
        done();
      });
    });

    it('with case different name', (done) => {
      api.post(path)
      .set('Authorization', predefinedAdminUserToken)
      .send(DUMMY)
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors[ZERO].type)
          .to.equal(tu.uniErrorName);
        done();
      });
    });
  });

  it('forbidden if not admin user', (done) => {
    api.post(path)
    .set('Authorization', testUserToken)
    .send({
      key,
      value: 'def',
    })
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      if (err) {
        return done(err);
      } else {
        expect(res.body.errors).to.have.length(1);
        expect(res.body.errors).to.have.deep.property('[0].type',
          'ForbiddenError');
        done();
      }
    });
  });

  it('sucessful creation by predefined admin user', (done) => {
    api.post(path)
    .set('Authorization', predefinedAdminUserToken)
    .send({
      key,
      value: 'def',
    })
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      } else {
        expect(res.body.key).to.equal(key);
        expect(res.body).to.have.property('value', 'def');
        done();
      }
    });
  });

  it('Cannot post duplicate', (done) => {
    api.post(path)
    .set('Authorization', predefinedAdminUserToken)
    .send({
      key: `${tu.namePrefix}_GLOBAL_CONFIG_DUPE`,
      value: 'a duplicate',
    })
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      } else {
        expect(res.body).to.have.property('key',
          `${tu.namePrefix}_GLOBAL_CONFIG_DUPE`);
        expect(res.body).to.have.property('value', 'a duplicate');
        api.post(path)
        .set('Authorization', predefinedAdminUserToken)
        .send({
          key: `${tu.namePrefix}_GLOBAL_CONFIG_DUPE`,
          value: 'post a duplicate',
        })
        .end((err2, res2) => {
          expect(res2.body).to.have.deep.property('errors[0].type',
            'SequelizeUniqueConstraintError');
          done();
        });
      }
    });
  });
});
