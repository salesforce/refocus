/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/profiles/post.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const ZERO = 0;
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/profiles';
const expect = require('chai').expect;

describe('tests/api/v1/profiles/post.js >', () => {
  const predefinedAdminUserToken = tu.createAdminToken();
  let token;
  const p0 = { name: `${tu.namePrefix}1` };

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  describe('POST profile', () => {
    it('Ok, user is admin', (done) => {
      api.post(`${path}`)
      .set('Authorization', predefinedAdminUserToken)
      .send(p0)
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.name).to.equal(p0.name);
        expect(res.body.subjectAccess).to.equal('rw');
        done();
      });
    });
  });

  it('fail, not an admin profile', (done) => {
    api.post(`${path}`)
    .set('Authorization', token)
    .send(p0)
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[ZERO].type).to.equal('ForbiddenError');
      done();
    });
  });

  it('fail, no token provided', (done) => {
    api.post(`${path}`)
    .send(p0)
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[ZERO].type).to.equal('ForbiddenError');
      done();
    });
  });

  it('Fail, duplicate profile', (done) => {
    // Create profile ___1
    tu.db.Profile.create(p0);
    /* Create identical profile */
    api.post(`${path}`)
    .set('Authorization', predefinedAdminUserToken)
    .send(p0)
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[ZERO].type)
      .to.contain('SequelizeUniqueConstraintError');
      done();
    });
  });

  it('Fail, invalid profile name', (done) => {
    api.post(`${path}`)
    .set('Authorization', predefinedAdminUserToken)
    .send({ name: '' })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[ZERO].type)
      .to.contain('SCHEMA_VALIDATION_FAILED');
      done();
    });
  });
});
