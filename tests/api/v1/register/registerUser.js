/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/register/registerUser.js
 */

const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const tu = require('../../../testUtils');
const Profile = tu.db.Profile;
const User = tu.db.User;
const Token = tu.db.Token;
const path = '/v1/register';

describe('api: registerUser', () => {
  after(u.forceDelete);

  it('register user successfully', (done) => {
    api.post(path)
    .send(u.toCreate)
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.email).to.be.equal(u.toCreate.email);
      expect(res.body.name).to.be.equal(u.toCreate.username);

      Token.findAll({ where: { name: res.body.name } })
      .then((tokens) => {
        expect(tokens.length).to.be.equal(1);
        expect(tokens[0].isRevoked).to.be.equal('0');
      })
      .catch((_err) => done(_err));

      done();
    });
  });

  it('should not be able to register without username', (done) => {
    api.post(path)
    .send({
      email: 'email@email.com',
      password: 'fakePasswd',
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .expect(/Missing required property: username/)
    .end((err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('should not be able to register without password', (done) => {
    api.post(path)
    .send({
      username: 'user1',
      email: 'email@email.com',
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .expect(/Missing required property: password/)
    .end((err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
  it('user already exists', (done) => {
    api.post(path)
    .send(u.toCreate)
    .expect(constants.httpStatus.BAD_REQUEST)
    .expect(/User already exists/)
    .end((err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('invalid email id', (done) => {
    api.post(path)
    .send({
      email: 'wrongEmailFormat',
      password: 'fakePasswd',
      username: 'myusername'
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .expect(/ValidationError/)
    .end((err) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});

describe('api: register sso user', () => {
  let ssoUser;
  beforeEach((done) => {
    Profile.create({
      name: tu.namePrefix + 1,
    })
    .then((createdProfile) => {
      return User.create({
        profileId: createdProfile.id,
        name: `${tu.namePrefix}1`,
        email: 'user@example.com',
        password: 'ssopassword',
        sso: true,
      });
    })
    .then((createdUser) => {
      ssoUser = createdUser;
      done();
    })
    .catch((err) => done(err));
  });

  after(u.forceDelete);

  it('saved sso user registers successfully', (done) => {
    api.post(path)
    .send({
      email: ssoUser.email,
      password: 'newPassword',
      username: `${tu.namePrefix}1`,
    })
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.be.equal(`${tu.namePrefix}1`);
      expect(res.body.email).to.be.equal('user@example.com');
      expect(res.body.sso).to.be.equal(false);
      done();
    });
  });
});

