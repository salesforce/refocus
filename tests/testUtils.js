/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/testUtils.js
 */

'use strict';

const pfx = '___';
const jwtUtil = require('../utils/jwtUtil');
const constants = require('../api/v1/constants');
const db = require('../db');
const testStartTime = new Date();
const userName = `${pfx}testUser@refocus.com`;
const featureToggles = require('feature-toggles');
const adminUser = require('../config').db.adminUser;
const adminProfile = require('../config').db.adminProfile;

/**
 * Performs a regex test on the key to determine whether it looks like a
 * postgres uuid. This helps us determine whether to try finding a record by
 * id first then failing over to searching by name, or if the key doesn't meet
 * the criteria to be a postgres uuid, just skip straight to searching by name.
 *
 * @param {String} key - The key to test
 * @returns {Boolean} - True if the key looks like an id
 */
function looksLikeId(key) {
  return constants.POSTGRES_UUID_RE.test(key);
}

/**
 * By convention, all the resources we create in our tests are named using
 * the prefix so we can just do the destroy this way!
 * @param  {Object} model - model object
 * @param  {Object} testStartTime - start time
 * @returns {Promise} Promise to delete model object
 */
function forceDelete(model, testStartTime) {
  return model.destroy({
    where: {
      name: {
        $iLike: pfx + '%',
      },
      createdAt: {
        $lt: new Date(),
        $gte: testStartTime,
      },
    },
    force: true,
  });
} // forceDelete

module.exports = {
  userName,
  fakeUserCredentials: {
    email: 'user1@abc.com',
    password: 'fakePasswd',
    username: 'user1',
  },

  forceDeleteToken(done) {
    forceDelete(db.User, testStartTime)
    .then(() => forceDelete(db.Profile, testStartTime))
    .then(() => forceDelete(db.Token, testStartTime))
    .then(() => done())
    .catch(done);
  },

  db,
  looksLikeId,
  dbErrorName: 'SequelizeDatabaseError',
  dbError: new Error('expecting SequelizeDatabaseError'),
  fkErrorName: 'SequelizeForeignKeyConstraintError',
  fkError: new Error('expecting SequelizeForeignKeyConstraintError'),
  namePrefix: pfx,
  uniErrorName: 'SequelizeUniqueConstraintError',
  uniError: new Error('expecting SequelizeUniqueConstraintError'),
  valErrorName: 'SequelizeValidationError',
  valError: new Error('expecting SequelizeValidationError'),
  malFormedTokenError: new Error('expecting the token to be malformed'),
  forceDelete,
  schemaValidationErrorName: 'SCHEMA_VALIDATION_FAILED',
  gotExpectedLength(stringOrArray, len) {
    return stringOrArray.length === len;
  },

  gotArrayWithExpectedLength(arr, len) {
    return Array.isArray(arr) && this.gotExpectedLength(arr, len);
  },

  // create one more user
  createThirdUser() {
    return db.Profile.create({
      name: `${pfx}testProfilethird`,
    })
    .then((createdProfile) =>
      db.User.create({
        profileId: createdProfile.id,
        name: userName + 'third',
        email: userName + 'third',
        password: 'user123password',
      })
    );
  },

  // create another user
  createSecondUser() {
    return db.Profile.create({
      name: `${pfx}testProfilesecond`,
    })
    .then((createdProfile) =>
      db.User.create({
        profileId: createdProfile.id,
        name: userName + 'second',
        email: userName + 'second',
        password: 'user123password',
      })
    );
  },

  // create a token with the given userName
  createTokenFromUserName(usrName) {
    return jwtUtil.createToken(usrName, usrName);
  }, // createToken

  // create user and corresponding token to be used in api tests.
  // returns both the user and the token object
  createUserAndToken() {
    return db.Profile.create({ name: `${pfx}testProfile` })
    .then((createdProfile) => db.User.create({
      profileId: createdProfile.id,
      name: userName,
      email: userName,
      password: 'user123password',
    }))
    .then((user) => {
      const obj = { user };
      obj.token = jwtUtil.createToken(userName, userName);
      return obj;
    });
  },

  // create user object from a given user name
  createUser(usrName) {
    return db.Profile.create({ name: `${pfx}` + usrName + 'profile' })
    .then((createdProfile) => db.User.create({
      profileId: createdProfile.id,
      name: `${pfx}` + usrName,
      email: usrName + '@' + usrName + '.com',
      password: usrName,
    }));
  },

  // create user and corresponding token to be used in api tests.
  createToken() {
    return db.Profile.create({ name: `${pfx}testProfile` })
    .then((createdProfile) => db.User.create({
      profileId: createdProfile.id,
      name: userName,
      email: userName,
      password: 'user123password',
    }))
    .then(() => jwtUtil.createToken(userName, userName));
  }, // createToken

  // create admin token
  createAdminToken() {
    return jwtUtil.createToken(
      adminUser.name,
      adminUser.name,
      { IsAdmin: true, ProfileName: adminProfile.name }
    );
  }, // createAdminToken

  // delete user
  forceDeleteUser(done) {
    forceDelete(db.User, testStartTime)
    .then(() => forceDelete(db.Token, testStartTime))
    .then(() => forceDelete(db.Profile, testStartTime))
    .then(() => done())
    .catch(done);
  }, // forceDeleteUser

  // delete subject
  forceDeleteSubject(done) {
    forceDelete(db.Subject, testStartTime)
    .then(() => done())
    .catch(done);
  }, // forceDeleteSubject

  toggleOverride(key, value) {
    featureToggles._toggles[key] = value;
  }, // toggleOverride

  // username used to create the token in all the tests
  userName,
}; // exports
