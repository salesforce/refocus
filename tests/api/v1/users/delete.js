/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/users/delete.js
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
const Op = require('sequelize').Op;

describe(`tests/api/v1/users/delete.js >`, () => {
  const ZERO = 0;
  const ONE = 1;
  const TWO = 2;
  let profileOneId = '';
  let profileTwoId = '';
  const userOne = `${tu.namePrefix}test@refocus.com`;
  const userTwo = `${tu.namePrefix}poop@refocus.com`;
  const userThree = `${tu.namePrefix}quote@refocus.com`;
  const userFour = `${tu.namePrefix}marvin@refocus.com`;
  const userFive = `${tu.namePrefix}jan@refocus.com`;
  const userSix = `${tu.namePrefix}rachel@refocus.com`;
  const tname = `${tu.namePrefix}Voldemort`;
  const pname = `${tu.namePrefix}testProfile`;
  const normalUserToken = jwtUtil.createToken(userOne, userOne);
  const user3Token = jwtUtil.createToken(userThree, userThree);
  const user4Token = jwtUtil.createToken(userFour, userFour);
  const user5Token = jwtUtil.createToken(userFive, userFive);
  let user1id;
  let user2id;
  let user3id;
  let user4id;
  let user5id;
  let user6id;

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
      return User.create({
        profileId: profileOneId,
        name: userOne,
        email: userOne,
        password: userOne,
      });
    })
    .then((u) => user1id = u.id)

    // another normal user
    .then(() => User.create({
      profileId: profileTwoId,
      name: userTwo,
      email: userTwo,
      password: userTwo,
    }))
    .then((u) => user2id = u.id)

    // another normal user
    .then(() => User.create({
      profileId: profileTwoId,
      name: userThree,
      email: userThree,
      password: userThree,
    }))
    .then((u) => user3id = u.id)

    // another normal user
    .then(() => User.create({
      profileId: profileTwoId,
      name: userFour,
      email: userFour,
      password: userFour,
    }))
    .then((u) => user4id = u.id)

    // another normal user
    .then(() => User.create({
      profileId: profileTwoId,
      name: userFive,
      email: userFive,
      password: userFive,
    }))
    .then((u) => user5id = u.id)

    // another normal user
    .then(() => User.create({
      profileId: profileTwoId,
      name: userSix,
      email: userSix,
      password: userSix,
    }))
    .then((u) => user6id = u.id)

    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  it('no user with this id exists', (done) => {
    api.delete(`${path}/a3d89333-4c2c-48e2-9124-d37ea6ec0fbc`)
    .set('Authorization', OBAdminUserToken)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) return done(err);
      return done();
    });
  });

  it('no user with this name exists', (done) => {
    api.delete(`${path}/usernot@found.com`)
    .set('Authorization', OBAdminUserToken)
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) return done(err);
      return done();
    });
  });

  describe('admin user >', () => {
    it('can delete another user by name', (done) => {
      api.delete(`${path}/${userOne}`)
      .set('Authorization', OBAdminUserToken)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property('name', userOne);
        expect(res.body.isDeleted).to.be.greaterThan(ZERO);
        return done();
      });
    });

    it('can delete another user by id', (done) => {
      api.delete(`${path}/${user2id}`)
      .set('Authorization', OBAdminUserToken)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property('name', userTwo);
        expect(res.body.isDeleted).to.be.greaterThan(ZERO);
        return done();
      });
    });
  });

  describe('non-admin user >', () => {
    it('can delete self by name', (done) => {
      api.delete(`${path}/${userThree}`)
      .set('Authorization', user3Token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property('name', userThree);
        expect(res.body.isDeleted).to.be.greaterThan(ZERO);
        return done();
      });
    });

    it('can delete self by id', (done) => {
      api.delete(`${path}/${user4id}`)
      .set('Authorization', user4Token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) return done(err);
        expect(res.body).to.have.property('name', userFour);
        expect(res.body.isDeleted).to.be.greaterThan(ZERO);
        return done();
      });
    });

    it('cannot delete other user by name', (done) => {
      api.delete(`${path}/${userSix}`)
      .set('Authorization', user5Token)
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) return done(err);
        return done();
      });
    });

    it('cannot delete other user by id', (done) => {
      api.delete(`${path}/${user6id}`)
      .set('Authorization', user5Token)
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) return done(err);
        return done();
      });
    });
  });
});
