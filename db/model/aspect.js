/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/aspect.js
 */

const common = require('../helpers/common');
const u = require('../helpers/aspectUtils');
const constants = require('../constants');
const dbErrors = require('../dbErrors');
const assoc = {};
const timeoutLength = 10;
const timeoutRegex = /^[0-9]{1,9}[SMHDsmhd]$/;
const valueLabelLength = 10;
const redisOps = require('../../cache/redisOps');
const aspectType = redisOps.aspectType;
const sampleType = redisOps.sampleType;
const Promise = require('bluebird');

module.exports = function aspect(seq, dataTypes) {
  const Aspect = seq.define('Aspect', {
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
    isDeleted: {
      type: dataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    imageUrl: {
      type: dataTypes.STRING(constants.fieldlen.url),
      validate: { isUrl: true },
    },
    isPublished: {
      type: dataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    name: {
      type: dataTypes.STRING(constants.fieldlen.normalName),
      allowNull: false,
      validate: {
        is: constants.nameRegex,
      },
    },
    criticalRange: {
      type: dataTypes.ARRAY(dataTypes.FLOAT),
      allowNull: true,
      validate: {
        rangeOk: u.validateStatusRange,
      },
    },
    warningRange: {
      type: dataTypes.ARRAY(dataTypes.FLOAT),
      allowNull: true,
      validate: {
        rangeOk: u.validateStatusRange,
      },
    },
    infoRange: {
      type: dataTypes.ARRAY(dataTypes.FLOAT),
      allowNull: true,
      validate: {
        rangeOk: u.validateStatusRange,
      },
    },
    okRange: {
      type: dataTypes.ARRAY(dataTypes.FLOAT),
      allowNull: true,
      validate: {
        rangeOk: u.validateStatusRange,
      },
    },
    rank: {
      type: dataTypes.INTEGER,
      allowNull: true,
    },
    timeout: {
      type: dataTypes.STRING(timeoutLength),
      allowNull: false,
      validate: {
        is: timeoutRegex,
      },
    },
    valueLabel: {
      type: dataTypes.STRING(valueLabelLength),
    },
    valueType: {
      type: dataTypes.ENUM('BOOLEAN', 'NUMERIC', 'PERCENT'),
      defaultValue: 'BOOLEAN',
    },
    relatedLinks: {
      type: dataTypes.ARRAY(dataTypes.JSON),
      allowNull: true,
      defaultValue: constants.defaultJsonArrayValue,
      validate: {
        validateJsonSchema(value) {
          common.validateJsonSchema(value);
        },
      },
    },
    tags: {
      type: dataTypes.ARRAY(dataTypes.STRING(constants.fieldlen.normalName)),
      allowNull: true,
      defaultValue: constants.defaultArrayValue,
    },
  }, {
    classMethods: {
      getAspectAssociations() {
        return assoc;
      },

      getProfileAccessField() {
        return 'aspectAccess';
      },

      postImport(models) {
        assoc.user = Aspect.belongsTo(models.User, {
          foreignKey: 'createdBy',
          as: 'user',
        });
        assoc.samples = Aspect.hasMany(models.Sample, {
          as: 'samples',
          foreignKey: 'aspectId',
          hooks: true,
        });
        assoc.writers = Aspect.belongsToMany(models.User, {
          as: 'writers',
          through: 'AspectWriters',
          foreignKey: 'aspectId',
        });

        Aspect.addScope('defaultScope', {
          include: [
            {
              association: assoc.user,
              attributes: ['name', 'email', 'fullName'],
            },
          ],
          order: ['Aspect.name'],
        }, {
          override: true,
        });

        Aspect.addScope('forRealTime', (values) => ({
          where: {
            id: { $in: values },
          },
          include: [
            {
              association: assoc.user,
              attributes: ['name', 'email', 'fullName'],
            },
          ],
        }));
      },
    },
    hooks: {

      /**
       * TODO:
       * 1. Have a look at the sampleStore logic and confirm that it is
       * doing what it is supposed to do.
       *
       */

      /**
       * When an aspect is created. Add its entry in the aspectStore
       * and the sampleStore if any.
       *
       * @param {Aspect} inst - The deleted instance
       * @returns {Promise}
       */
      afterCreate(inst /* , opts */) {
        // Prevent any changes to original inst dataValues object
        const instDataObj = JSON.parse(JSON.stringify(inst.get()));
        return Promise.join(
          redisOps.addKey(aspectType, inst.getDataValue('name')),
          redisOps.hmSet(aspectType, inst.name, instDataObj)
        );
      }, // hooks.afterCreate

      /**
       * Check Generator references and set the isDeleted timestamp.
       *
       * @param {Aspect} inst - The instance being destroyed
       * @returns {Promise}
       */
      beforeDestroy(inst /* , opts */) {
        return inst.checkGeneratorReferences('delete')
        .then(() => common.setIsDeleted(seq.Promise, inst));
      }, // hooks.beforeDestroy

      /**
       * Check Generator references before unpublishing or renaming
       * @param {Aspect} inst - The instance being updated
       * @returns {Promise}
       */
      beforeUpdate(inst /* , opts */) {
        const unpublished = inst.previous('isPublished') && !inst.isPublished;
        const renamed = inst.previous('name') !== inst.name;
        if (unpublished || renamed) {
          const action = unpublished ? 'unpublish' : 'rename';
          return inst.checkGeneratorReferences(action);
        }
      }, // hooks.beforeUpdate

      /**
       * If isPublished is being updated from true to false or the name of the
       * aspect is changed, delete any samples associated with the aspect.
       * If aspect tags changed, send an "add" realtime event for all the
       * samples for this aspect. (The beforeUpdate hook will already have
       * sent a "delete" event.) This way, perspectives which filter by aspect
       * tags will get the right samples.
       *
       * @param {Aspect} inst - The updated instance
       * @returns {Promise}
       */
      afterUpdate(inst /* , opts */) {
        const promiseArr = [];
        const nameChanged = inst.previous('name') !== inst.getDataValue('name');
        const isPublishedChanged =
          inst.previous('isPublished') !== inst.getDataValue('isPublished');

        /*
         * When the sample store feature is enabled do the following
         * 1. if aspect name is changed and it is published, rename the entry
         * on aspectStore and the aspect hash.
         * 2. if the aspect is updated to published, add an entry to the
         * aspectStore and create the aspect hash
         * 3. if the aspect is updated to unpublished, delete the entry in the
         * aspectStore, delete the aspect hash and delete the related samples
         * 4. if the aspect that is updated is already published, update the
         * the aspect with the new values.
        */
        if (nameChanged && inst.isPublished) {
          const newAspName = inst.name;
          const oldAspectName = inst._previousDataValues.name;

          // rename entry in aspectStore
          promiseArr.push(redisOps.renameKey(aspectType,
            oldAspectName, newAspName));

          /*
           * delete multiple possible sample entries in the sample master
           * list of index and the related sample hashes
           */
          promiseArr.push(redisOps.deleteKeys(sampleType, aspectType,
            oldAspectName));
        } else if (isPublishedChanged) {
          // Prevent any changes to original inst dataValues object
          const instDataObj = JSON.parse(JSON.stringify(inst.get()));
          promiseArr.push(redisOps.hmSet(aspectType, inst.name, instDataObj));

          // add the aspect to the aspect master list regardless of isPublished
          promiseArr.push(redisOps.addKey(aspectType, inst.name));
          if (!inst.isPublished) {
            /*
             * Delete multiple possible entries in the sample master list of
             * index
             */
            promiseArr.push(redisOps.deleteKeys(sampleType,
              aspectType, inst.name));
          }
        } else if (inst.isPublished) {
          const instChanged = {};
          Object.keys(inst._changed)
          .filter((key) => inst._changed[key])
          .forEach((key) => {
            instChanged[key] = inst[key];
          });
          promiseArr.push(redisOps.hmSet(aspectType, inst.name, instChanged));
        }

        return seq.Promise.all(promiseArr);
      }, // hooks.afterUpdate

      /**
       * When a publihsed aspect is deleted. Delete its entry in the aspectStore
       * and the sampleStore if any.
       *
       * @param {Aspect} inst - The deleted instance
       * @returns {Promise}
       */
      afterDelete(inst /* , opts */) {
        return Promise.join(
          redisOps.deleteKey(aspectType, inst.name),
          redisOps.deleteKeys(sampleType, aspectType, inst.name)
        );
      }, // hooks.afterDelete

      /**
       * Makes sure isUrl/isEmail validations will handle empty strings
       * appropriately.
       *
       * @param {Aspect} inst - The instance being validated
       * @returns {undefined} - OK
       */
      beforeValidate(inst /* , opts */) {
        if (inst.changed('helpUrl') &&
          inst.helpUrl !== null &&
          inst.helpUrl.length === 0) {
          inst.helpUrl = null;
        }

        if (inst.changed('imageUrl') &&
          inst.imageUrl !== null &&
          inst.imageUrl.length === 0) {
          inst.imageUrl = null;
        }

        if (inst.changed('helpEmail') &&
          inst.helpEmail !== null &&
          inst.helpEmail.length === 0) {
          inst.helpEmail = null;
        }
      },

    }, // hooks
    indexes: [
      {
        name: 'AspectUniqueLowercaseNameIsDeleted',
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

      checkGeneratorReferences(action) {
        const aspectName = this.previous('name');

        // the aspect names are stored in lowercase on the generator
        const where = { aspects: { $contains: [aspectName.toLowerCase()] } };
        return seq.models.Generator.findAll({ where })
        .then((gens) => {
          if (gens.length) {
            const genNames = gens.map(g => g.name);
            let usedBy;
            if (gens.length === 1) {
              usedBy = 'a Sample Generator';
            } else {
              usedBy = `${gens.length} Sample Generators`;
            }

            throw new dbErrors.ReferencedByGenerator({
              message: `Cannot ${action} Aspect ${aspectName}. It is ` +
              `currently in use by ${usedBy}: ${genNames}`,
            });
          }
        });
      },
    },
    paranoid: true,
  });

  return Aspect;
};
