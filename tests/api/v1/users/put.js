/**
 * Copyright (c) 2016, salesforce.com, inc.
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
const Profile = tu.db.Profile;
const User = tu.db.User;
const Token = tu.db.Token;

describe.only(`api: PUT ${path}`, () => {
  const ZERO = 0;
  const ONE = 1;
  const TWO = 2;
  let profileOneId = '';
  let profileTwoId = '';
  const adminUser = require('../../../../config').db.adminUser;
  const userOne = `${tu.namePrefix}test@refocus.com`;
  const userTwo = `${tu.namePrefix}poop@refocus.com`;
  const tname = `${tu.namePrefix}Voldemort`;
  const pname = `${tu.namePrefix}testProfile`;
  const normalUserToken = jwtUtil.createToken(
    userOne, userOne
  );
  const adminUserToken = jwtUtil.createToken(
    adminUser.name, adminUser.name
  );

  before((done) => {
    Profile.create({
      name: pname + ONE,
    })
    .then((profile) => {
      profileOneId = profile.id;
      return Profile.create({
        name: pname + TWO,
      })
    })
    .then((profile) => {
      profileTwoId = profile.id;
      User.create({
        profileId: profile.id,
        name: userOne,
        email: userOne,
        password: 'user123password',
      })
    }) // another normal user
    .then(() => User.create({
        profileId: profileTwoId,
        name: userTwo,
        email: userTwo,
        password: 'user123password',
      })
    )
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  it.skip('admin user can change their profileId', (done) => {
    const newName = 'adsaadadadadda' + userOne;
    api.put(path + '/' + adminUser.name)
    .set('Authorization', adminUserToken)
    .send({
      profileId: profileOneId,
      name: newName,
      email: newName,
      password: newName,
    })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      console.log(err, res)
      if (err) {
        done(err);
      }

      expect(res.body.profileId).to.equal(profileOneId);
      done();
    });
  });

  it('normal user FORBIDDEN from changing their profileId', (done) => {
    const newName = 'rwewewewewewew' + userTwo;
    api.put(path + '/' + userOne)
    .set('Authorization', normalUserToken)
    .send({
      profileId: profileOneId, // switching from profile one to two
      name: newName, // TODO: should not be required
      email: newName,
      password: newName,
    })
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      if (err) {
        done(err);
      } else {
        expect(res.body.errors).to.have.length(1);
        expect(res.body.errors).to.have.deep.property('[0].type',
          'ForbiddenError');
        done();
      }
    });
  });
});
