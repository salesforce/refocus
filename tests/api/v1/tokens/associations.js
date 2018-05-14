/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/tokens/associations.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Token = tu.db.Token;
const User = tu.db.User;
const expect = require('chai').expect;
const Profile = tu.db.Profile;
const path = '/v1/tokens';
const Joi = require('joi');

describe(`tests/api/v1/tokens/associations.js, GET ${path} >`, () => {
  let token;
  const username = `${tu.namePrefix}test@refocus.com`;

  const profile1 = { name: `${tu.namePrefix}testProfile2` };
  const user1 = {
    name: username,
    email: username,
    password: 'user123password',
  };
  const token1 = {
    name: `${tu.namePrefix}token1`,
  };

  before((done) => {
    tu.createUser('testUser')
    .then((user) => {
      token = tu.createTokenFromUserName(user.name);
      done();
    })
    .catch(done);
  });

  before((done) => {
    Profile.create(profile1)
    .then((profile) => {
      user1.profileId = profile.id;
      return User.create(user1);
    })
    .then((user) => {
      token1.createdBy = user.id;
      return Token.create(token1);
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  const joiSchema = {
    user: Joi.object().keys({
      name: Joi.string().required(),
      email: Joi.string().required(),
      profile: Joi.object().keys({
        name: Joi.string().required(),
      }).required(),
    }),
  };

  it('get by key includes associations', (done) => {
    api.get(`${path}/${token1.name}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.have.property('user');
      expect(Joi.validate(res.body.user, joiSchema.user).error).to.be.null;
    })
    .end(done);
  });

  it('get by key with field param does not include associations', (done) => {
    api.get(`${path}/${token1.name}?fields=name`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.not.have.property('user');
    })
    .end(done);
  });

  /*
   * This test fails because of a bug in sequelize.
   * It doesn't properly handle multiple associations when a limit is applied:
   * It selects the attributes before doing the join for the association, which
   * causes an error when the foreign key is not included in the fields.
   * I think it was fixed in https://github.com/sequelize/sequelize/pull/9188
   * Skipping until we upgrade Sequelize...
   */
  it.skip(`get by key: an association can be specified as a field param (user)`, (done) => {
    api.get(`${path}/${token1.name}?fields=name,user`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.body).to.be.an('object');
      expect(res.body).to.have.keys('id', 'name', 'user', 'apiLinks');
      expect(Joi.validate(res.body.user, joiSchema.user).error).to.be.null;
    })
    .end(done);
  });
});
