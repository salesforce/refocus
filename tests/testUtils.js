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
const db = require('../db');
const testStartTime = new Date();
const userName = `${pfx}testUser@refocus.com`;

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
  fakeUserCredentials: {
    email: 'user1@abc.com',
    password: 'fakePasswd',
    username: 'user1'
  },
  forceDeleteToken(done) {
    forceDelete(db.User, testStartTime)
    .then(() => forceDelete(db.Profile, testStartTime))
    .then(() => forceDelete(db.Token, testStartTime))
    .then(() => done())
    .catch((err) => done(err));
  },
  db,
  dbErrorName: 'SequelizeDatabaseError',
  dbError: new Error('expecting SequelizeDatabaseError'),
  fkErrorName: 'SequelizeForeignKeyConstraintError',
  fkError: new Error('expecting SequelizeForeignKeyConstraintError'),
  namePrefix: pfx,
  uniErrorName: 'SequelizeUniqueConstraintError',
  uniError: new Error('expecting SequelizeUniqueConstraintError'),
  valErrorName: 'SequelizeValidationError',
  valError: new Error('expecting SequelizeValidationError'),
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
        name: userName+'third',
        email: userName+'third',
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
        name: userName+'second',
        email: userName+'second',
        password: 'user123password',
      })
    );
  },
  // create user and corresponding token to be used in api tests.
  createToken() {
    return db.Profile.create({
      name: `${pfx}testProfile`,
    })
    .then((createdProfile) =>
      db.User.create({
        profileId: createdProfile.id,
        name: userName,
        email: userName,
        password: 'user123password',
      })
    )
    .then(() => jwtUtil.createToken(userName, userName));
  }, // createToken

  // delete users
  forceDeleteUser(done) {
    forceDelete(db.User, testStartTime)
    .then(() => forceDelete(db.Profile, testStartTime))
    .then(() => done())
    .catch((err) => done(err));
  }, // forceDeleteUser
  // delete users
  forceDeleteSubject(done) {
    forceDelete(db.Subject, testStartTime)
    .then(() => done())
    .catch((err) => done(err));
  }, // forceDeleteUser
}; // exports
