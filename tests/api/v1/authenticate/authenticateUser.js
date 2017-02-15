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
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const registerPath = '/v1/register';
const authPath = '/v1/authenticate';
const tu = require('../../../testUtils');
const Profile = tu.db.Profile;
const User = tu.db.User;

describe(`api: authenticateUser`, () => {
  before((done) => {
    api.post(registerPath)
    .send(u.fakeUserCredentials)
    .end((err) => {
      if (err) {
        done(err);
      }

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
    .end((err) => {
      if (err) {
        done(err);
      }

      done();
    });
  });
  it('should not be able to authenticate without username', (done) => {
    api.post(authPath)
    .send({
      email: 'unknown@abc.com',
      password: 'fakePasswd',
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .expect(/Missing required property: username/)
    .end((err) => {
      if (err) {
        done(err);
      }

      done();
    });
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
    .end((err) => {
      if (err) {
        done(err);
      }

      done();
    });
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
    .end((err) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('sucessful authentication', (done) => {
    api.post(authPath)
    .send(u.fakeUserCredentials)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      expect(res.body.success).to.be.true;
      expect(res.body.token).to.be.equal(undefined);
      done();
    });
  });
});

describe('api: authenticate sso user', () => {
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

  after(u.forceDelete);

  it('sso user cannot authenticate by username password', (done) => {
    api.post(authPath)
    .send({
      email: ssoUser.email,
      password: 'fakePasswd',
      username: ssoUser.name,
    })
    .expect(constants.httpStatus.BAD_REQUEST)
    .expect(/Invalid credentials/)
    .end((err) => {
      if (err) {
        done(err);
      }

      done();
    });
  });
});

describe('loadView: /authenticate route', () => {
  let tokenVal;

  before((done) => {
    api.post(registerPath)
    .send(u.fakeUserCredentials)
    .end((err, res) => {
      if (err) {
        done(err);
      }

      tokenVal = res.body.token;
      done();
    });
  });

  after(u.forceDelete);

  it('/authenticate returns token', (done) => {
    api
    .post('/authenticate')
    .type('form')
    .send({
      username: u.fakeUserCredentials.username,
      password: u.fakeUserCredentials.password,
    })
    .end((error, res) => {
      if (error) {
        done(error);
      } else {
        expect(res.body).to.have.property('token')
        .and.not.equal(undefined);
        done();
      }
    });
  });
});
