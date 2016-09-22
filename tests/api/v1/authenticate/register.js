/**
 * tests/api/v1/authenticate/register.js
 */

'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const registerPath = '/v1/register';
const tu = require('../../../testUtils');
const Profile = tu.db.Profile;
const User = tu.db.User;

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
    api.post(registerPath)
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
