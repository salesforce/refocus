/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/tokens/revokeRestore.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/tokens';
const expect = require('chai').expect;
const Profile = tu.db.Profile;
const User = tu.db.User;
const Token = tu.db.Token;

describe('tests/api/v1/tokens/revokeRestore.js, ' +
`api: POST ${path}/:id/revoke and POST ${path}/:id/restore >`, () => {
  const predefinedAdminUserToken = tu.createAdminToken();
  let usr;
  let tid;

  beforeEach((done) => {
    Profile.create({ name: `${tu.namePrefix}testProfile` })
    .then((profile) => User.create({
      profileId: profile.id,
      name: `${tu.namePrefix}test@refocus.com`,
      email: `${tu.namePrefix}test@refocus.com`,
      password: 'user123password',
    }))
    .then((user) => {
      usr = user;
      return Token.create({
        name: `${tu.namePrefix}Voldemort`,
        createdBy: usr.id,
      });
    })
    .then((token) => {
      tid = token.id;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('admin user, ok', (done) => {
    api.post(`${path}/${tid}/revoke`)
    .set('Authorization', predefinedAdminUserToken)
    .send({})
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body)
      .to.have.property('name', `${tu.namePrefix}Voldemort`);
      expect(res.body.isRevoked > '0').to.be.true;
      api.post(`${path}/${tid}/restore`)
      .set('Authorization', predefinedAdminUserToken)
      .send({})
      .expect(constants.httpStatus.OK)
      .end((err2, res2) => {
        if (err2) {
          return done(err2);
        }

        expect(res2.body)
        .to.have.property('name', `${tu.namePrefix}Voldemort`);
        expect(res2.body).to.have.property('isRevoked', '0');
        done();
      });
    });
  });

  it('admin user, try to restore a token if it was not already revoked',
  (done) => {
    api.post(`${path}/${tid}/restore`)
    .set('Authorization', predefinedAdminUserToken)
    .send({})
    .expect(constants.httpStatus.BAD_REQUEST)
    .end(done);
  });

  it('admin user, try to revoke a token if it was already revoked', (done) => {
    api.post(`${path}/${tid}/revoke`)
    .set('Authorization', predefinedAdminUserToken)
    .send({})
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.property('name', `${tu.namePrefix}Voldemort`);
      expect(res.body.isRevoked > '0').to.be.true;
      api.post(`${path}/${tid}/revoke`)
      .set('Authorization', predefinedAdminUserToken)
      .send({})
      .expect(constants.httpStatus.BAD_REQUEST)
      .end(done);
    });
  });

  it('not admin user, should be forbidden', (done) => {
    api.post(`${path}/${tid}/revoke`)
    .set('Authorization', '???')
    .send({})
    .expect(constants.httpStatus.FORBIDDEN)
    .end(done);
  });
});
