/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /tests/db/model/profile/withUser.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Profile = tu.db.Profile;
const User = tu.db.User;

describe('tests/db/model/profile/withUser.js >', () => {
  let profile = {};
  let user = {};

  // TODO rewrite this to use the "withUsers" scope
  const includeUser = [
    {
      model: User,
      as: 'users',
      attributes: ['id', 'name'],
    },
  ];

  beforeEach((done) => {
    Profile.create({
      name: tu.namePrefix + 1,
    })
    .then((createdProfile) => {
      profile = createdProfile;
      return User.create({
        profileId: createdProfile.id,
        name: `${tu.namePrefix}1`,
        email: 'hello@world.com',
        password: 'fgrefwgdrsefdfeafs',
      });
    })
    .then((createdUser) => {
      user = createdUser;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('Expect to throw error, when update user profileId to a deleted profile ' +
  'Id', (done) => {
    let newProfileId = '';
    Profile.create({ name: `${tu.namePrefix}2` })
    .then((p) => {
      newProfileId = p.id;
      return p.destroy();
    })
    .then(() => user.update({ profileId: newProfileId }))
    .then((returnedUser) => {
      const msg = `Unexpected user returned: ${JSON.stringify(returnedUser)}`;
      done(new Error(msg));
    })
    .catch((err) => {
      expect(err.name).to.equal('SequelizeValidationError');
      expect(err.errors[0].type).to.equal('Validation error');
      expect(err.errors[0].path).to.equal('profileExists');
      done();
    })
    .catch(done);
  });

  it('Expect update profile to null, to throw SequelizeValidationError ' +
  'error, with path profileIdNotNull', (done) => {
    user.update({ profileId: null })
    .then(() => done(new Error('Unexpected successful update')))
    .catch((err) => {
      expect(err.name).to.equal('SequelizeValidationError');
      expect(err.errors[0].type).to.equal('Validation error');
      expect(err.errors[0].path).to.equal('profileExists');
      done();
    })
    .catch(done);
  });

  it('Profile should have userCount of 1, after attaching a user to it',
  (done) => {
    Profile.scope('withUsers').findOne({
      where: { id: profile.id },
    })
    .then((p) => {
      expect(p.userCount).to.equal(1);
      expect(p.users.length).to.equal(1);
      done();
    })
    .catch(done);
  });

  it('Update user profileId, decrements old profile\'s userCount',
  (done) => {
    expect(user);
    Profile.create({ name: `${tu.namePrefix}2` })
    .then((p) => user.update({ profileId: p.id }))
    .then(() => Profile.scope('withUsers').findOne({
      where: { id: profile.id },
    }))
    .then((oldProfile) => {
      expect(oldProfile.userCount).to.equal(0);
      expect(!oldProfile.users);
      done();
    })
    .catch(done);
  });

  it('Profile should have userCount of 0, after attaching, and detaching a ' +
  'user to it', (done) => {
    expect(user);
    user.destroy()
    .then(() => Profile.findOne({
      where: {
        id: profile.id,
      },
      include: includeUser,
    }))
    .then((profileFromGet) => {
      expect(profileFromGet.userCount).to.equal(0);
      expect(!profile.dataValues.users);
      done();
    })
    .catch(done);
  });

  it('Update user profileId, increments new profile userCount', (done) => {
    let profileId = '';
    expect(user);
    Profile.create({ name: `${tu.namePrefix}2` })
    .then((createdProfile) => {
      profileId = createdProfile.id;
      return user.update({ profileId: createdProfile.id });
    })
    .then(() => Profile.findOne({
      where: { id: profileId },
      include: includeUser,
    }))
    .then((newProfile) => {
      expect(newProfile.userCount).to.equal(1);
      expect(newProfile.users.length).to.equal(1);
      done();
    })
    .catch(done);
  });

  it('Deleting profile with user attached, throws error', (done) => {
    profile.destroy()
    .then((result) => {
      const msg = `Test should have failed but got ${JSON.stringify(result)}`;
      throw new Error(msg);
    }, (err) => {
      expect(err).to.have.property('name')
      .to.equal('ProfileDeleteConstraintError');
      expect(err).to.have.property('profile');
      done();
    })
    .catch(done);
  });

  it('After attaching a user to a profile, get all profiles should contain ' +
  'a profile object with userCount of 1, and users array of length 1. All ' +
  'profiles will have users field ', (done) => {
    Profile.findAndCountAll({
      where: {
        name: tu.namePrefix + 1,
      },
      include: includeUser,
    })
    .then((found) => {
      expect(found.count).to.equal(1);
      const p = found.rows[0];
      expect(p.userCount).to.equal(1);
      expect(p.get('users').length).to.equal(1);
      done();
    })
    .catch(done);
  });
});
