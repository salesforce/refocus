/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/profile.js
 */

const common = require('../helpers/common');
const ProfileDeleteConstraintError = require('../dbErrors')
  .ProfileDeleteConstraintError;
const AdminUpdateDeleteForbidden = require('../dbErrors')
  .AdminUpdateDeleteForbidden;
const adminProfileName = require('../../config').db.adminProfile.name;

const assoc = {};

module.exports = function profile(seq, dataTypes) {
  const Profile = seq.define('Profile', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    name: {
      type: dataTypes.STRING,
      allowNull: false,
    },
    aspectAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'rw',
    },
    botAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'rw',
    },
    collectorAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'r',
    },
    eventAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'rw',
    },
    generatorAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'r',
    },
    generatorTemplateAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'r',
    },
    isDeleted: {
      type: dataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    lensAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'rw',
    },
    perspectiveAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'rw',
    },
    profileAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'r',
    },
    roomAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'rw',
    },
    roomTypeAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'rw',
    },
    sampleAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'rw',
    },
    subjectAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'rw',
    },
    userAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'rw',
    },
    userCount: {
      type: dataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    defaultScope: {
      order: ['name'],
    },
    hooks: {

      /**
       * Set the isDeleted timestamp and prevent destroying a profile if it
       * still has users. No one is allowed to delete the out-of-the box admin
       * profile.
       *
       * @param {Aspect} inst - The instance.
       * @returns {Promise}
       */
      beforeDestroy(inst /* , opts */) {
        if (inst.get('name').toLowerCase() ===
          common.dbconf.adminProfile.name.toLowerCase()) {
          throw new AdminUpdateDeleteForbidden();
        }

        if (inst.get('users')) {
          if (inst.get('users').length) {
            const err = new ProfileDeleteConstraintError();
            err.profile = inst.get();
            throw err;
          }
        } else {
          return new seq.Promise((resolve, reject) =>
            inst.getUsers()
            .then((users) => {
              if (users && users.length) {
                const err = new ProfileDeleteConstraintError();
                err.profile = inst.get();
                throw err;
              }

              return common.setIsDeleted(seq.Promise, inst);
            })
            .then(() => resolve(inst))
            .catch((err) => reject(err))
          );
        }
      }, // hooks.beforeDestroy

      beforeFind(opts) {
        if (opts.attributes) {
          const idx = opts.attributes.indexOf('users');
          if (idx >= 0) {
            opts.attributes.splice(idx, 1);
          }
        }
      }, // hooks.beforeFind

      /**
       * No one is allowed to modify the out-of-the-box admin profile.
       */
      beforeUpdate(inst /* , opts */) {
        if (inst.get('name').toLowerCase() ===
          common.dbconf.adminProfile.name.toLowerCase()) {
          throw new AdminUpdateDeleteForbidden();
        }
      }, // hooks.beforeUpdate
    },
    indexes: [
      {
        name: 'ProfileUniqueLowercaseNameIsDeleted',
        unique: true,
        fields: [
          seq.fn('lower', seq.col('name')),
          'isDeleted',
        ],
      },
    ],
    paranoid: true,
  });

  /**
   * Class Methods:
   */

  Profile.getProfileAssociations = function () {
    return assoc;
  };

  Profile.getProfileAccessField = function () {
    return 'profileAccess';
  };

  Profile.postImport = function (models) {
    assoc.users = Profile.hasMany(models.User, {
      foreignKey: 'profileId',
      as: 'users',
    });
    Profile.addScope('withUsers', {
      include: [
        {
          association: assoc.users,
          attributes: { exclude: ['password'] },
        },
      ],
    });

  };

  Profile.isAdmin = function (profileId) {
    return new Promise((resolve, reject) => {
      Profile.findByPk(profileId)
      .then((p) => resolve(p &&
        p.name.toLowerCase() === adminProfileName.toLowerCase()))
      .catch((err) => reject(err));
    });
  }; // isAdmin

  Profile.hasWriteAccess = function (profileId, model) {
    const accessModel = model.getAccessField();
    return new Promise((resolve, reject) => {
      Profile.findByPk(profileId)
      .then((p) => resolve(p &&
        p[accessModel] === 'rw'.toLowerCase()))
      .catch(reject);
    });
  }; // hasWriteAccess

  return Profile;
};
