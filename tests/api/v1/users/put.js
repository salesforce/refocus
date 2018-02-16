/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/users/put.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/users';
const expect = require('chai').expect;
const jwtUtil = require('../../../../utils/jwtUtil');
const OBAdminProfile = require('../../../../config').db.adminProfile;
const Profile = tu.db.Profile;
const User = tu.db.User;

describe(`tests/api/v1/users/put.js, PUT ${path} >`, () => {
  const ZERO = 0;
  const ONE = 1;
  const TWO = 2;
  let profileOneId = '';
  let profileTwoId = '';
  const adminUser = require('../../../../config').db.adminUser;
  const userOne = `${tu.namePrefix}test@refocus.com`;
  const userTwo = `${tu.namePrefix}poop@refocus.com`;
  const userThree = `${tu.namePrefix}quote@refocus.com`;
  const userFive = `${tu.namePrefix}bbbbb@refocus.com`;
  const tname = `${tu.namePrefix}Voldemort`;
  const pname = `${tu.namePrefix}testProfile`;
  /* out of the box admin user token */
  const OBAdminUserToken = tu.createAdminToken();

  before((done) => {
    Profile.create({ name: pname + ONE })
    .then((profile) => {
      profileOneId = profile.id;
      return Profile.create({ name: pname + TWO });
    })
    .then((profile) => {
      profileTwoId = profile.id;
      return User.create({
        profileId: profileOneId,
        name: userOne,
        email: userOne,
        password: userOne,
      });
    })
    /* another normal user */
    .then(() => User.create({
      profileId: profileTwoId,
      name: userTwo,
      email: userTwo,
      password: userTwo,
    }))
    .then(() => User.create({
      profileId: profileTwoId,
      name: userThree,
      email: userThree,
      password: userThree,
    }))
    .then(() => User.create({
      profileId: profileTwoId,
      name: userFive,
      email: userFive,
      password: userFive,
    }))
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  describe('non-out of box admin >', () => {
    const userFour = `${tu.namePrefix}wwwwww@refocus.com`;
    const userZero = `${tu.namePrefix}fffffff@refocus.com`;
    const adminUserToken = jwtUtil.createToken(
      userFour, userFour, { IsAdmin: true, ProfileName: OBAdminProfile.name }
    );

    before((done) => {
      let adminProfileId = '';
      User.findOne({
        where: {
          name: {
            $iLike: adminUser.name,
          },
        },
      })
      .then((OBAdminUser) => adminProfileId = OBAdminUser.profileId)
      /* create a normal user */
      .then(() => User.create({
        profileId: profileOneId,
        name: userZero,
        email: userZero,
        password: userZero,
      }))
      /* create a normal user */
      .then(() => User.create({
        profileId: profileOneId,
        name: userFour,
        email: userFour,
        password: userFour,
      }))
      .then((normalUser) => normalUser.update({ profileId: adminProfileId }))
      .then(() => done())
      .catch(done);
    });

    it('cannot put to OB Admin', (done) => {
      const newName = `${tu.namePrefix}` + userFour;
      api.put(path + '/' + adminUser.name)
      .set('Authorization', adminUserToken)
      .send({
        profileId: profileTwoId,
        name: newName,
        email: newName,
        password: newName,
      })
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors).to.have.length(1);
        expect(res.body.errors)
        .to.have.deep.property('[0].type', 'AdminUpdateDeleteForbidden');
        return done();
      });
    });

    it('can change a normal user\'s profileId', (done) => {
      const newName = `${tu.namePrefix}` + userFour;
      api.put(path + '/' + userZero)
      .set('Authorization', adminUserToken)
      .send({
        profileId: profileTwoId,
        name: newName,
        email: newName,
        password: newName,
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.profileId).to.equal(profileTwoId);
        return done();
      });
    });
  });

  describe('normal user >', () => {
    it('cannot change its profileId', (done) => {
      const normalUserToken = jwtUtil.createToken(
        userFive, userFive
      );
      const newName = `${tu.namePrefix}` + userFive;
      api.put(path + '/' + userFive)
      .set('Authorization', normalUserToken)
      .send({
        profileId: profileOneId,
        name: newName,
        email: newName,
        password: newName,
      })
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors).to.have.length(1);
        expect(res.body.errors)
        .to.have.deep.property('[0].type', 'ForbiddenError');
        return done();
      });
    });

    it('can PUT, when its new profileId === old profileId', (done) => {
      const normalUserToken = jwtUtil.createToken(
        userThree, userThree
      );
      const newName = `${tu.namePrefix}` + userThree;
      api.put(path + '/' + userThree)
      .set('Authorization', normalUserToken)
      .send({
        profileId: profileTwoId, // identical to original profileId
        name: newName,
        email: newName,
        password: newName,
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.profileId).to.equal(profileTwoId);
        return done();
      });
    });

    it('FORBIDDEN from changing another user\'s profileId', (done) => {
      const userOneToken = jwtUtil.createToken(
        userOne, userOne
      );
      const newName = `${tu.namePrefix}` + userTwo;
      api.put(path + '/' + userTwo)
      .set('Authorization', userOneToken)
      .send({
        profileId: profileOneId,
        name: newName,
        email: newName,
        password: newName,
      })
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors).to.have.length(1);
        expect(res.body.errors)
        .to.have.deep.property('[0].type', 'ForbiddenError');
        return done();
      });
    });
  });

  describe('out of box admin >', () => {
    it('can PUT normal user', (done) => {
      const newName = `${tu.namePrefix}` + userOne;
      api.put(path + '/' + userOne)
      .set('Authorization', OBAdminUserToken)
      .send({
        profileId: profileTwoId,
        name: newName,
        email: newName,
        password: newName,
      })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.profileId).to.equal(profileTwoId);
        return done();
      });
    });

    it('FORBIDDEN from changing own profileId', (done) => {
      const newName = `${tu.namePrefix}` + userOne;
      api.put(path + '/' + adminUser.name)
      .set('Authorization', OBAdminUserToken)
      .send({
        profileId: profileOneId,
        name: newName,
        email: newName,
        password: newName,
      })
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors).to.have.length(1);
        expect(res.body.errors)
        .to.have.deep.property('[0].type', 'AdminUpdateDeleteForbidden');
        return done();
      });
    });
  });
});
