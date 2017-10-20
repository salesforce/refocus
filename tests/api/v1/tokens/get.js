/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/tokens/get.js
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

describe('tests/api/v1/tokens/get.js >', () => {
  let usr;
  let tid;
  const username = `${tu.namePrefix}test@refocus.com`;

  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    Profile.create({ name: `${tu.namePrefix}testProfile2` })
    .then((profile) => User.create({
      profileId: profile.id,
      name: username,
      email: username,
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

  after(u.forceDelete);

  it('contains createdBy and user name', (done) => {
    api.get(`${path}/${tid}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.User.name).to.equal(username);
      expect(res.body.createdBy).to.be.defined;
      done();
    });
  });

  it('found', (done) => {
    api.get(`${path}/${tid}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(`${tu.namePrefix}Voldemort`);
      expect(res.body.isRevoked).to.equal('0');
      done();
    });
  });

  it('not found', (done) => {
    api.get(`${path}/123-abc`)
    .set('Authorization', token)
    .expect(constants.httpStatus.NOT_FOUND)
    .end(done);
  });
});
