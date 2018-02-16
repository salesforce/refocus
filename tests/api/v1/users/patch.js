/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/users/patch.js
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
const Profile = tu.db.Profile;
const User = tu.db.User;
const OBAdminProfile = require('../../../../config').db.adminProfile;
const OBAdminUser = require('../../../../config').db.adminUser;

describe(`tests/api/v1/users/patch.js, PATCH ${path} >`, () => {
  const ONE = 1;
  const TWO = 2;
  let profileOneId = '';
  let profileTwoId = '';
  const userOne = `${tu.namePrefix}test@refocus.com`;
  const userTwo = `${tu.namePrefix}poop@refocus.com`;
  const userThree = `${tu.namePrefix}quote@refocus.com`;
  const tname = `${tu.namePrefix}Voldemort`;
  const pname = `${tu.namePrefix}testProfile`;
  const normalUserToken = jwtUtil.createToken(userOne, userOne);

  // out of the box admin user token
  const OBAdminUserToken = tu.createAdminToken();

  before((done) => {
    Profile.create({ name: pname + ONE })
    .then((profile) => {
      profileOneId = profile.id;
      return Profile.create({
        name: pname + TWO,
      });
    })
    .then((profile) => {
      profileTwoId = profile.id;
      User.create({
        profileId: profileOneId,
        name: userOne,
        email: userOne,
        password: userOne,
      });
    })

    // another normal user
    .then(() => User.create({
      profileId: profileTwoId,
      name: userTwo,
      email: userTwo,
      password: userTwo,
    }))

    // another normal user
    .then(() => User.create({
      profileId: profileTwoId,
      name: userThree,
      email: userThree,
      password: userThree,
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
            $iLike: OBAdminUser.name,
          },
        },
      })
      .then((OBAdminUser) => adminProfileId = OBAdminUser.profileId)

      // create a normal user
      .then(() => User.create({
        profileId: profileOneId,
        name: userZero,
        email: userZero,
        password: userZero,
      }))

      // create a normal user
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

    it('cannot PATCH OB Admin profile id', (done) => {
      api.patch(path + '/' + OBAdminUser.name)
      .set('Authorization', adminUserToken)
      .send({
        profileId: profileTwoId,
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
      api.patch(path + '/' + userZero)
      .set('Authorization', adminUserToken)
      .send({ profileId: profileTwoId })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.profileId).to.equal(profileTwoId);
        return done();
      });
    });

    it('can change its own profileId', (done) => {
      api.patch(path + '/' + userFour)
      .set('Authorization', adminUserToken)
      .send({ profileId: profileTwoId })
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

  describe('out of box admin user >', () => {
    it('FORBIDDEN from changing their profileId', (done) => {
      api.patch(path + '/' + OBAdminUser.name)
      .set('Authorization', OBAdminUserToken)
      .send({ profileId: profileOneId })
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
      api.patch(path + '/' + userOne)
      .set('Authorization', OBAdminUserToken)
      .send({ profileId: profileTwoId })
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
    it('can patch its own fields, other than profileId', (done) => {
      const newName = tname + userTwo;
      api.patch(path + '/' + userTwo)
      .set('Authorization', normalUserToken)
      .send({ name: newName })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.name).to.equal(newName);
        return done();
      });
    });

    it('FORBIDDEN from changing their profileId', (done) => {
      api.patch(path + '/' + userThree)
      .set('Authorization', normalUserToken)
      .send({ profileId: profileOneId })
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
});
