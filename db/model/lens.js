/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/lens.js
 */

const common = require('../helpers/common');
const constants = require('../constants');
const redisCache = require('../../cache/redisCache').client.cache;
const lensUtil = require('../../utils/lensUtil');
const featureToggles = require('feature-toggles');
const dbErrors = require('../dbErrors');
const assoc = {};

/**
 * @param {Object} _inst - a sequelize Lens instance.
 */
function setLensObjectInCache(_inst) {
  const lensObj = lensUtil.cleanAndCreateLensJson(_inst);
  redisCache.set(lensObj.id, JSON.stringify(lensObj));
  redisCache.set(lensObj.name, JSON.stringify(lensObj));
}

module.exports = function lens(seq, dataTypes) {
  const Lens = seq.define('Lens', {
    description: {
      type: dataTypes.STRING(constants.fieldlen.longish),
    },
    helpEmail: {
      type: dataTypes.STRING(constants.fieldlen.email),
      validate: { isEmail: true },
    },
    helpUrl: {
      type: dataTypes.STRING(constants.fieldlen.url),
      validate: { isUrl: true },
    },
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    isCustom: {
      type: dataTypes.BOOLEAN,
      defaultValue: true,
    },
    isDeleted: {
      type: dataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    isPublished: {
      type: dataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    library: {
      type: dataTypes.BLOB,
      allowNull: false,
    },
    name: {
      type: dataTypes.STRING,
      allowNull: false,
    },
    sourceDescription: {
      type: dataTypes.STRING(constants.fieldlen.longish),
    },
    sourceName: {
      type: dataTypes.STRING,
      allowNull: false,
    },
    sourceVersion: {
      type: dataTypes.STRING,
    },
    thumbnailUrl: {
      type: dataTypes.STRING(constants.fieldlen.url),
      validate: { isUrl: true },
    },
    version: {
      type: dataTypes.STRING,
    },
  }, {
    classMethods: {
      getLensAssociations() {
        return assoc;
      },

      getProfileAccessField() {
        return 'lensAccess';
      },

      postImport(models) {
        assoc.user = Lens.belongsTo(models.User, {
          foreignKey: 'installedBy',
          as: 'user',
        });
        assoc.writers = Lens.belongsToMany(models.User, {
          as: 'writers',
          through: 'LensWriters',
          foreignKey: 'lensId',
        });

        Lens.addScope('lensLibrary', {
          attributes: { include: ['name', 'library'] },
        }, {
          override: true,
        });

        Lens.addScope('defaultScope', {
          include: [
            {
              association: assoc.user,
              attributes: ['name', 'email'],
            },
          ],
          attributes: { exclude: ['library'] },
          order: ['Lens.name'],
        }, {
          override: true,
        });
      },
    },

    hooks: {
      /**
       * Prohibit deleting a lens if perspectives are using it.
       */
      beforeDestroy(inst /* , opts */) {
        return seq.models.Perspective.findAll({
          where: {
            lensId: inst.id,
          },
          attributes: ['id', 'lensId', 'name'],
        })
        .then((perspectives) => {
          if (perspectives && perspectives.length) {
            throw new dbErrors.ValidationError({
              message:
                `Cannot delete ${inst.name} because it is still in use by the ` +
                'following perspectives: ' + perspectives.map((p) => p.name),
            });
          } else {
            return common.setIsDeleted(seq.Promise, inst);
          }
        });
      }, // beforeDestroy

      /**
       * Prohibit unpublishing a lens if perspectives are using it.
       */
      beforeUpdate(inst /* , opts */) {
        if (inst.changed('isPublished') && inst.isPublished === false) {
          return seq.models.Perspective.findAll({
            where: {
              lensId: inst.id,
            },
            attributes: ['id', 'lensId', 'name'],
          })
          .then((perspectives) => {
            if (perspectives && perspectives.length) {
              throw new dbErrors.ValidationError({
                message:
                  `Cannot unpublish ${inst.name} because it is still in use ` +
                  'by the following perspectives: ' +
                  perspectives.map((p) => p.name),
              });
            }
          });
        }
      }, // beforeUpdate

      /**
       * Makes sure isUrl/isEmail validations will handle empty strings
       * appropriately.
       *
       * @param {Lens} inst - The instance being validated
       * @returns {undefined} - OK
       */
      beforeValidate(inst /* , opts */) {
        if (inst.changed('helpUrl') &&
          inst.helpUrl !== null &&
          inst.helpUrl.length === 0) {
          inst.helpUrl = null;
        }

        if (inst.changed('thumbnailUrl') &&
          inst.thumbnailUrl !== null &&
          inst.thumbnailUrl.length === 0) {
          inst.thumbnailUrl = null;
        }

        if (inst.changed('helpEmail') &&
          inst.helpEmail !== null &&
          inst.helpEmail.length === 0) {
          inst.helpEmail = null;
        }
      },

      afterDestroy(inst /* , opts */) {
        redisCache.del(inst.id);
        redisCache.del(inst.name);
      },

      /**
       *  If installedBy is valid, reload to attach user object.
       */
      afterCreate(inst /* , opts */) {
        if (inst.installedBy) {
          const library = inst.library; // reload removes the library
          inst.reload()
          .then((reloadedInstance) => {
            reloadedInstance.library = library;
            setLensObjectInCache(reloadedInstance);
          });
        } else {
          setLensObjectInCache(inst);
        }
      },

      /**
       * Clear this record from the cache so that a fresh entry is populated
       * from the API layer when the lens is fetched.
       * Note: we don't just add inst to the cache from here because default
       * scope excludes the "library" attribute, which obviously needs to be
       * cached.
       */
      afterUpdate(inst /* , opts */) {
        // Clear the lens from the cache whether it's stored by id or by name.
        redisCache.del(inst.id);
        redisCache.del(inst.name);
      },
    },
    name: {
      singular: 'Lens',
      plural: 'Lenses',
    },
    indexes: [
      {
        name: 'LensUniqueLowercaseNameIsDeleted',
        unique: true,
        fields: [
          seq.fn('lower', seq.col('name')),
          'isDeleted',
        ],
      },
    ],
    instanceMethods: {
      isWritableBy(who) {
        return new seq.Promise((resolve /* , reject */) =>
          this.getWriters()
          .then((writers) => {
            if (!writers.length) {
              resolve(true);
            }

            const found = writers.filter((w) =>
              w.name === who || w.id === who);
            resolve(found.length === 1);
          }));
      }, // isWritableBy
    },
    paranoid: true,
    tableName: 'Lenses',
  });
  return Lens;
};
