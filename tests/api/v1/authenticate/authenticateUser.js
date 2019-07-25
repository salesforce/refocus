/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/authenticate/authenticateUser.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const registerPath = '/v1/register';
const authPath = '/v1/authenticate';
const tu = require('../../../testUtils');
const Profile = tu.db.Profile;
const User = tu.db.User;
const samlAuthentication =
  require('../../../../view/loadView.js').samlAuthentication;

describe('tests/api/v1/authenticate/authenticateUser.js >', () => {
  describe(`authenticateUser >`, () => {
    let defaultToken;
    let createTime;
    before((done) => {
      api.post(registerPath)
      .send(u.fakeUserCredentials)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        defaultToken = res.body.token;
        createTime = res.body.lastLogin;
        done();
      });
    });
    after(u.forceDelete);
    it('no user found', (done) => {
      api.post(authPath)
      .send({
        email: 'unknown@abc.com',
        password: 'fakePasswd',
        username: 'unknown',
      })
      .expect(constants.httpStatus.UNAUTHORIZED)
      .expect(/LoginError/)
      .end(done);
    });
    it('should not be able to authenticate without username', (done) => {
      api.post(authPath)
      .send({
        email: 'unknown@abc.com',
        password: 'fakePasswd',
      })
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect(/Missing required property: username/)
      .end(done);
    });
    it('Wrong password', (done) => {
      api.post(authPath)
      .send({
        email: 'user1@abc.com',
        password: 'wrongPasswd',
        username: 'user1',
      })
      .expect(constants.httpStatus.UNAUTHORIZED)
      .expect(/LoginError/)
      .end(done);
    });

    it('authentication with wrong username should fail', (done) => {
      api.post(authPath)
      .send({
        email: 'user1@abc.com',
        password: 'wrongPasswd',
        username: 'wrongusername',
      })
      .expect(constants.httpStatus.UNAUTHORIZED)
      .expect(/LoginError/)
      .end(done);
    });

    it('sucessful authentication, lastLogin is updated', (done) => {
      api.post(authPath)
      .send(u.fakeUserCredentials)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.success).to.be.true;
        expect(res.body.token).to.be.equal(undefined);

        api.get(`/v1/users/${u.fakeUserCredentials.username}`)
        .set('Authorization', defaultToken)
        .expect(constants.httpStatus.OK)
        .end((err2, res2) => {
          if (err2) {
            return done(err2);
          }

          expect(res2.body.lastLogin).to.be.above(createTime);
          done();
        });
      });
    });
  });

  describe('authenticate sso user >', () => {
    let ssoUser;
    beforeEach((done) => {
      Profile.create({ name: tu.namePrefix + 1 })
      .then((createdProfile) => User.create({
        profileId: createdProfile.id,
        name: `${tu.namePrefix}1`,
        email: 'user@example.com',
        password: 'user123password',
        sso: true,
      }))
      .then((createdUser) => {
        ssoUser = createdUser;
        done();
      })
      .catch(done);
    });

    afterEach(u.forceDelete);

    it('sso user cannot authenticate by username password', (done) => {
      api.post(authPath)
      .send({
        email: ssoUser.email,
        password: 'fakePasswd',
        username: ssoUser.name,
      })
      .expect(constants.httpStatus.BAD_REQUEST)
      .expect(/Invalid credentials/)
      .end(done);
    });

    it('updated existing SSO user to have fullName', (done) => {
      const samlResponse = {
        email: ssoUser.email,
        firstname: 'testFirstName',
        lastname: 'testLastName',
      };

      const expectedFullName =
        `${samlResponse.firstname} ${samlResponse.lastname}`;

      samlAuthentication(samlResponse, (err, user) => {
        if (err) {
          return done(err);
        }

        expect(user.fullName).to.equal(expectedFullName);
        expect(user.lastLogin).to.be.instanceof(Date);
        done();
      });
    });

    it('New SSO user has fullName', (done) => {
      const samlResponse = {
        email: 'newuser@example.com',
        firstname: 'testFirstName',
        lastname: 'testLastName',
      };

      const expectedFullName =
        `${samlResponse.firstname} ${samlResponse.lastname}`;

      samlAuthentication(samlResponse, (err, newUser) => {
        if (err) {
          return done(err);
        }

        expect(newUser.fullName).to.equal(expectedFullName);
        expect(newUser.lastLogin).to.be.instanceof(Date);
        done();
      });
    });
  });
});
