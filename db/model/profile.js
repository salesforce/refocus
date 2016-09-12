/**
 * db/model/profile.js
 */

const common = require('../helpers/common');
const ProfileDeleteConstraintError = require('../dbErrors')
  .ProfileDeleteConstraintError;
const AdminUpdateDeleteForbidden = require('../dbErrors')
  .AdminUpdateDeleteForbidden;

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
      defaultValue: 'r',
    },
    isDeleted: {
      type: dataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    lensAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'r',
    },
    perspectiveAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'r',
    },
    profileAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'r',
    },
    sampleAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'r',
    },
    subjectAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'r',
    },
    userAccess: {
      type: dataTypes.ENUM('r', 'rw'),
      defaultValue: 'r',
    },
    userCount: {
      type: dataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  }, {
    classMethods: {
      getProfileAssociations() {
        return assoc;
      },

      postImport(models) {
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

        // Profile.addScope('defaultScope', {
        //   include: [
        //     {
        //       model: models.User,
        //       attributes: [ 'id', 'name' ],
        //     }
        //   ],
        // }, {
        //   override: true,
        // });
      },
    },
    defaultScope: {
      order: ['Profile.name'],
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

      beforeFind(opts, fn) {
        if (opts.attributes) {
          const idx = opts.attributes.indexOf('users');
          if (idx >= 0) {
            opts.attributes.splice(idx, 1);
          }
        }

        fn(null, opts);
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
  return Profile;
};
