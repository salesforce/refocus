/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/user.js
 */

const constants = require('../constants');
const u = require('../helpers/userUtils');
const common = require('../helpers/common');
const AdminUpdateDeleteForbidden = require('../dbErrors')
  .AdminUpdateDeleteForbidden;

const usernameLength = 254;
const assoc = {};

// TODO implement "decryptPassword" functions
module.exports = function user(seq, dataTypes) {
  const User = seq.define('User', {
    email: {
      type: dataTypes.STRING(constants.fieldlen.email),
      validate: { isEmail: true },
    },
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    imageUrl: {
      type: dataTypes.STRING(constants.fieldlen.url),
      validate: { isUrl: true },
    },
    isDeleted: {
      type: dataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    name: {
      type: dataTypes.STRING(usernameLength),
      allowNull: false,
    },
    password: {
      type: dataTypes.STRING,
      allowNull: false,
    },
    sso: {
      type: dataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    classMethods: {
      getUserAssociations() {
        return assoc;
      },

      postImport(models) {
        assoc.createdBy = User.belongsTo(models.User, {
          foreignKey: 'createdBy',
        });
        assoc.profile = User.belongsTo(models.Profile, {
          as: 'profile',
          foreignKey: {
            name: 'profileId',
            allowNull: false,
          },
          hooks: true,
        });
        assoc.writableAspects = User.belongsToMany(models.Aspect, {
          as: 'writableAspects',
          through: 'AspectWriters',
          foreignKey: 'userId',
        });
        assoc.writableLenses = User.belongsToMany(models.Lens, {
          as: 'writableLenses',
          through: 'LensWriters',
          foreignKey: 'userId',
        });
        assoc.writablePerspectives = User.belongsToMany(models.Perspective, {
          as: 'writablePerspectives',
          through: 'PerspectiveWriters',
          foreignKey: 'userId',
        });
        assoc.writableSubjects = User.belongsToMany(models.Subject, {
          as: 'writableSubjects',
          through: 'SubjectWriters',
          foreignKey: 'userId',
        });
        User.addScope('defaultScope', {
          attributes: {
            exclude: ['password'],
          },
          include: [
            {
              association: assoc.profile,
              attributes: ['name'],
            },
          ],
          order: ['User.name'],
        }, {
          override: true,
        });
        User.addScope('withSensitiveInfo', {
          include: [
            {
              association: assoc.profile,
              attributes: ['name'],
            },
          ],
          order: ['User.name'],
        });
      },
    },
    hooks: {

      /**
       * Hashes password and Increments profile's userCount.
       *
       * @param {Instance} inst - The instance being created
       * @returns {Promise} which resolves to the instance, or rejects if
       *  Profile not found
       */
      beforeCreate(inst /* , opts */) {
        return new seq.Promise((resolve, reject) =>
          u.hashPassword(seq, inst.get('password'))
          .then((hash) => inst.set('password', hash))
          .then(() => seq.models.Profile.findById(inst.profileId))
          .then((p) => p.increment('userCount'))
          .then(() => resolve(inst))
          .catch((err) => reject(err))
        );
      }, // hooks.beforeCreate

      /**
       * Decrements profile's userCount. No one is allowed to delete the
       * out-of-the box admin user.
       *
       * @param {Instance} inst - The instance being deleted
       * @returns {Promise} which resolves to the instance, or rejects if
       *  Profile not found
       */
      beforeDestroy(inst /* , opts */) {
        if (inst.get('name').toLowerCase() ===
          common.dbconf.adminUser.name.toLowerCase()) {
          throw new AdminUpdateDeleteForbidden();
        }

        return new seq.Promise((resolve, reject) =>
          inst.getProfile()
          .then((p) => p.decrement('userCount'))
          .then(() => common.setIsDeleted(seq.Promise, inst))
          .then(() => resolve(inst))
          .catch((err) => reject(err))
        );
      }, // hooks.beforeDestroy

      /**
       * If profileId was updated, increments userCount for new profile and
       * decrements for old profile. No one is allowed to change the profile of
       * the out-of-the-box admin user.
       *
       * @param {Instance} inst - The instance being updated
       * @returns {undefined|Promise} undefined profileId was not changed,
       *  but if profileId *was* changed, then returns a Promise which
       *  resolves to the instance, or rejects if old or new Profile not found
       */
      beforeUpdate(inst /* , opts */) {
        if (inst.changed('password')) {
          u.hashPassword(seq, inst.get('password'))
          .then((hash) => inst.set('password', hash));
        }

        if (inst.get('name').toLowerCase() ===
          common.dbconf.adminUser.name.toLowerCase() &&
          inst.changed('profileId')) {
          throw new AdminUpdateDeleteForbidden();
        }

        if (inst.changed('profileId')) {
          return new seq.Promise((resolve, reject) =>
            inst.getProfile()
            .then((p) => p.increment('userCount'))
            .then(() => inst.previous('profileId'))
            .then((v) => seq.models.Profile.findById(v))
            .then((prev) => prev.decrement('userCount'))
            .then(() => resolve(inst))
            .catch((err) => reject(err))
          );
        }
      }, // hooks.beforeUpdate

      /**
       * Makes sure isUrl/isEmail validations will handle empty strings
       * appropriately.
       *
       * @param {Aspect} inst - The instance being validated
       * @returns {undefined} - OK
       */
      beforeValidate(inst /* , opts */) {
        if (inst.changed('imageUrl') &&
          inst.imageUrl !== null &&
          inst.imageUrl.length === 0) {
          inst.imageUrl = null;
        }

        if (inst.changed('email') &&
          inst.email !== null &&
          inst.email.length === 0) {
          inst.email = null;
        }
      },
    },
    indexes: [
      {
        name: 'UserUniqueLowercaseNameIsDeleted',
        unique: true,
        fields: [
          seq.fn('lower', seq.col('name')),
          'isDeleted',
        ],
      },
      {
        name: 'UserLowercaseEmail',
        fields: [
          seq.fn('lower', seq.col('email')),
        ],
      },
    ],
    paranoid: true,
    validate: {

      /**
       * Prevents a user from being assigned to an invalid profile.
       *
       * @returns {undefined}
       * @throws {Error} if profile does not exist
       */
      profileExists() {
        if (this.profileId === null) {
          throw new Error('Invalid profile: null');
        } else {
          const _this = this;
          return new seq.Promise((resolve, reject) =>
            seq.models.Profile.findById(_this.profileId)
            .then((p) => {
              if (p) {
                if (Number(p.isDeleted) === 0) {
                  resolve();
                } else {
                  reject(new Error(
                    `Profile ${_this.profileId} has been soft-deleted`));
                }
              } else {
                reject(new Error(`Profile ${_this.profileId} not found`));
              }
            })
            .catch((err) => reject(err))
          );
        }
      }, // validate.profileExists

    },
  });
  return User;
};
