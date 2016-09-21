/**
 * tests/testUtils.js
 */

'use strict';

var pfx = '___';
const jwtUtil = require('../api/v1/helpers/jwtUtil');
const db = require('../db');
const testStartTime = new Date();

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

  gotExpectedLength(stringOrArray, len) {
    return stringOrArray.length === len;
  },

  gotArrayWithExpectedLength(arr, len) {
    return Array.isArray(arr) && this.gotExpectedLength(arr, len);
  },

  // create user and corresponding token to be used in api tests.
  createToken() {
    return db.Profile.create({
      name: `${pfx}testProfile`,
    })
    .then((createdProfile) =>
      db.User.create({
        profileId: createdProfile.id,
        name: `${pfx}test@refocus.com`,
        email: `${pfx}test@refocus.com`,
        password: 'user123password',
      })
    )
    .then(() => jwtUtil.createToken(
      {
        name: `${pfx}test@refocus.com`,
        email: `${pfx}test@refocus.com`,
      }
      ));
  }, // createToken

  // delete users
  forceDeleteUser(done) {
    forceDelete(db.User, testStartTime)
    .then(() => forceDelete(db.Profile, testStartTime))
    .then(() => done())
    .catch((err) => done(err));
  }, // forceDeleteUser

}; // exports
