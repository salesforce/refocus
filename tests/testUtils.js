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
const sampleModel = require('../cache/models/samples');
const testStartTime = new Date();
const defaultUserName = `${pfx}testUser`;
const featureToggles = require('feature-toggles');
const adminUser = require('../config').db.adminUser;
const adminProfile = require('../config').db.adminProfile;
const sampleStore = require('../cache/sampleStore');
const redisClient = require('../cache/redisCache').client.sampleStore;
const doTimeout = require('../cache/sampleStoreTimeout').doTimeout;
const Op = require('sequelize').Op;
const Promise = require('bluebird');

/*
 * A wrapper to create, read, update and delete the samples using the same
 * methods exposed by sequelize.
 */
const Sample = {
  // Create and return the created sample
  create: (toCreate, userObject) => {
    return sampleModel.postSample(toCreate, userObject);
  }, // create

  // Return all the samples in sample store
  findAll: () => {
    const commands = [];
    return redisClient.sortAsync(sampleStore.constants.indexKey.sample, 'alpha')
    .then((sampleKeys) => {

      sampleKeys.forEach((key) => {
        commands.push(['hgetall', key]);
      });

      return redisClient.batch(commands).execAsync();
    }).catch((err) => err);

  }, // findAll

  // Returns a sample object given its name
  findOne: (sampleName) => {
    return sampleModel.getOneSample(sampleName.name || sampleName)
    .then((res) => {
      const sample = res[0];
      const aspect = res[1];
      if (!sample || !aspect) {
        return null;
      }

      sample.aspect = aspect;
      return sample;
    }).catch((err) => err);
  }, // findOne

  /*
   * Update and return the updated sample.
   * Note: The patchSample method expects an object with queryBody and key.
   * So the sample is wrapped with the required field and sent to
   * the patchSample method
   */
  update: (toUpdate, sampleName, _userName) => {
    const wrappedObject = {
      queryBody: { value: toUpdate },
      key: { value: toUpdate.name || sampleName },
    };
    return sampleModel.patchSample(wrappedObject, _userName);
  }, // update

  // Delete the sample and return it.
  delete: (sampleName, _userName) => {
    return sampleModel.delete(sampleName, _userName);
  }, // delete

  // Bulk upsert the sample by looking up its name in the sampleStore.
  bulkUpsertByName: (toUpsert, user) => {
    return sampleModel.bulkUpsertByName(toUpsert, user);
  }, // bulkUpsertByName

  // Bulk create the sample. This call the create method defined above.
  bulkCreate: (toCreateArr, user) => {
    const promiseArr = [];
    toCreateArr.forEach((toCreate) => {
      promiseArr.push(Sample.create(toCreate, user));
    });
    return Promise.all(promiseArr);
  }, // bulkCreate

  // upsert the sample by looking up its name in the sampleStore
  upsertByName: (toUpsert, user) => {
    return sampleModel.upsertSample(toUpsert, user);
  }, // upsertByName

  doTimeout,
}; // Sample

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
 * @param  {Object} _testStartTime - start time
 * @returns {Promise} Promise to delete model object
 */
function forceDelete(model, _testStartTime = testStartTime) {
  return model.destroy({
    where: {
      name: {
        [Op.iLike]: pfx + '%',
      },
      createdAt: {
        [Op.lt]: new Date(),
        [Op.gte]: _testStartTime,
      },
    },
    force: true,
  });
} // forceDelete

/**
 * Force delete multiple models.
 * @param  {Array} models - model objects to delete
 * @returns {Promise} Promise to delete model objects
 */
function forceDeleteAll(...models) {
  return Promise.each(models, forceDelete);
}

module.exports = {
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
  duplicateResourceErrorName: 'DuplicateResourceError',
  fkErrorName: 'SequelizeForeignKeyConstraintError',
  fkError: new Error('expecting SequelizeForeignKeyConstraintError'),
  namePrefix: pfx,
  uniErrorName: 'SequelizeUniqueConstraintError',
  uniError: new Error('expecting SequelizeUniqueConstraintError'),
  valErrorName: 'SequelizeValidationError',
  valError: new Error('expecting SequelizeValidationError'),
  malFormedTokenError: new Error('expecting the token to be malformed'),
  forceDelete,
  forceDeleteAll,
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
        name: defaultUserName + 'third',
        email: `${defaultUserName}third@refocus.com`,
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
        name: defaultUserName + 'second',
        email: `${defaultUserName}second@refocus.com`,
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
  createUserAndToken(userName=defaultUserName) {
    let profile;
    return db.Profile.create({ name: `${pfx}${userName}testProfile` })
    .then((createdProfile) => {
      profile = createdProfile;
      return db.User.create({
        profileId: createdProfile.id,
        name: userName,
        email: `${userName}@refocus.com`,
        password: 'user123password', });
    })
    .then((user) => {
      user.profile = profile.dataValues;
      const token = jwtUtil.createToken(userName, userName);
      return { user, token };
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
    }))
    .then((user) => user.reload());
  },

  // create user and corresponding token to be used in api tests.
  createToken(userName=defaultUserName) {
    return db.Profile.create({ name: `${pfx}${userName}testProfile` })
    .then((createdProfile) => db.User.create({
      profileId: createdProfile.id,
      name: userName,
      email: `${userName}@refocus.com`,
      password: 'user123password',
    }))
    .then(() => jwtUtil.createToken(userName, userName));
  }, // createToken

  createGeneratorToken(tokenName) {
    return jwtUtil.createToken(
      tokenName,
      defaultUserName,
      { IsGenerator: true }
    );
  },

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

  forceDeleteAllRecords(dbModel) {
    return dbModel.destroy({
      where: {},
      force: true,
    });
  },

  Sample,

  toggleOverride(key, value) {
    featureToggles._toggles[key] = value;
  }, // toggleOverride

  // username used to create the token in all the tests
  userName: defaultUserName,

}; // exports
