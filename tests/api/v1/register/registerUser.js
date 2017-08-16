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

describe('tests/api/v1/register/registerUser.js >', () => {
  describe('registerUser >', () => {
    after(u.forceDelete);

    it('successful user registration does not persist token', (done) => {
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
          expect(tokens.length).to.be.equal(0);
        })
        .catch(done);
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
      .end(done);
    });

    it('should not be able to register without password', (done) => {
      api.post(path)
      .send({
        username: 'user1',
        email: 'email@email.com',
      })
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect(/Missing required property: password/)
      .end(done);
    });
    it('user already exists', (done) => {
      api.post(path)
      .send(u.toCreate)
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect(/User already exists/)
      .end(done);
    });

    it('invalid email id', (done) => {
      api.post(path)
      .send({
        email: 'wrongEmailFormat',
        password: 'fakePasswd',
        username: 'myusername',
      })
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect(/ValidationError/)
      .end(done);
    });
  });

  describe('sso user >', () => {
    let ssoUser;
    beforeEach((done) => {
      Profile.create({
        name: tu.namePrefix + 1,
      })
      .then((createdProfile) => User.create({
        profileId: createdProfile.id,
        name: `${tu.namePrefix}1`,
        email: 'user@example.com',
        password: 'ssopassword',
        sso: true,
      }))
      .then((createdUser) => {
        ssoUser = createdUser;
        done();
      })
      .catch(done);
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
});
