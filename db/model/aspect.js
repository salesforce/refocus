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
const featureToggles = require('feature-toggles');
const assoc = {};
const timeoutLength = 10;
const timeoutRegex = /^[0-9]{1,9}[SMHDsmhd]$/;
const valueLabelLength = 10;
const sampleEventNames = {
  add: 'refocus.internal.realtime.sample.add',
  upd: 'refocus.internal.realtime.sample.update',
  del: 'refocus.internal.realtime.sample.remove',
};
const sampleStoreFeature =
                  require('../../cache/sampleStore').constants.featureName;
const redisOps = require('../../cache/redisOps');
const aspectType = redisOps.aspectType;
const sampleType = redisOps.sampleType;

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
              attributes: ['name', 'email'],
            },
          ],
          order: ['Aspect.name'],
        }, {
          override: true,
        });

        Aspect.addScope('withSamples', {
          include: [
            {
              association: assoc.samples,
              attributes: { exclude: ['aspectId'] },
            },
          ],
        });
      },
    },
    hooks: {

      /**
       * When an aspect is created. Add its entry in the aspectStore
       * and the sampleStore if any.
       *
       * @param {Aspect} inst - The deleted instance
       */
      afterCreate(inst /* , opts */) {
        if (featureToggles.isFeatureEnabled(sampleStoreFeature)) {
          // Prevent any changes to original inst dataValues object
          const instDataObj = JSON.parse(JSON.stringify(inst.get()));

          // create an entry in aspectStore
          redisOps.addKey(aspectType, inst.getDataValue('name'));
          redisOps.hmSet(aspectType, inst.name, instDataObj);
        }
      }, // hooks.afterCreate

      /**
       * Set the isDeleted timestamp.
       *
       * @param {Aspect} inst - The instance being destroyed
       * @returns {Promise}
       */
      beforeDestroy(inst /* , opts */) {
        return new seq.Promise((resolve, reject) =>
          common.setIsDeleted(seq.Promise, inst)
          .then(() => inst.getSamples())
          .each((samp) => samp.destroy())
          .then(() => resolve(inst))
          .catch((err) => reject(err))
        );
      }, // hooks.beforeDestroy

      /**
       * Recalculate sample status if any of the status ranges changed.
       * If aspect tags changed, send a "delete" realtime event for all the
       * samples for this aspect. (The afterUpdate hook will subsequently send
       * an "add" event.) This way, perspectives which filter by aspect tags
       * will get the right samples.
       *
       * @param {Aspect} inst - The instance being updated
       * @returns {Promise}
       */
      beforeUpdate(inst /* , opts */) {
        const statusRangeWasUpdated = inst.changed('criticalRange') ||
          inst.changed('warningRange') ||
          inst.changed('infoRange') ||
          inst.changed('okRange');
        if (statusRangeWasUpdated) {
          return new seq.Promise((resolve, reject) =>
            inst.getSamples()
            .each((samp) => {
              samp.aspect = inst;
              samp.calculateStatus();
              samp.setStatusChangedAt();
              samp.save();
            })
            .then(() => resolve(inst))
            .catch((err) => reject(err))
          );
        }

        if (inst.changed('tags')) {
          return new seq.Promise((resolve, reject) => {
            inst.getSamples()
            .each((samp) =>
              common.sampleAspectAndSubjectArePublished(seq, samp)
              .then((published) => {
                if (published) {
                  return common.augmentSampleWithSubjectAspectInfo(seq, samp)
                  .then((s) => {
                    common.publishChange(s, sampleEventNames.del);
                  });
                }

                return seq.Promise.resolve(true);
              }))
            .then(() => resolve(inst))
            .catch(reject);
          });
        } // tags changed

        return seq.Promise.resolve(true);
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
        if (featureToggles.isFeatureEnabled(sampleStoreFeature)) {
          if (inst.changed('name') && inst.isPublished) {
            const newAspName = inst.name;
            const oldAspectName = inst._previousDataValues.name;

            // rename entry in aspectStore
            redisOps.renameKey(aspectType, oldAspectName, newAspName);

            /*
             * delete multiple possible sample entries in the sample master
             * list of index
             */
            redisOps.deleteKeys(sampleType, aspectType, inst.name);
          } else if (inst.changed('isPublished')) {

            // Prevent any changes to original inst dataValues object
            const instDataObj = JSON.parse(JSON.stringify(inst.get()));
            redisOps.hmSet(aspectType, inst.name, instDataObj);

            // add the aspect to the aspect master list regardless of isPublished
            redisOps.addKey(aspectType, inst.name);
            if (!inst.isPublished) {

              /*
               * Delete multiple possible entries in the sample master list of
               * index
               */
              redisOps.deleteKeys(sampleType, aspectType, inst.name);
            }
          } else if (inst.isPublished) {
            const instChanged = {};
            Object.keys(inst._changed).forEach((key) => {
              instChanged[key] = inst[key];
            });
            redisOps.hmSet(aspectType, inst.name, instChanged);
          }
        }

        if (inst.changed('isPublished') &&
          inst.previous('isPublished') &&
          !inst.getDataValue('isPublished') ||
          inst.changed('name')) {
          return new seq.Promise((resolve, reject) =>
            inst.getSamples()
            .each((samp) => samp.destroy())
            .then(() => resolve(inst))
            .catch((err) => reject(err))
          );
        }

        if (inst.changed('tags')) {
          return new seq.Promise((resolve, reject) => {
            inst.getSamples()
            .each((samp) =>
              common.sampleAspectAndSubjectArePublished(seq, samp)
              .then((published) => {
                if (published) {
                  return common.augmentSampleWithSubjectAspectInfo(seq, samp)
                  .then((s) => {
                    common.publishChange(s, sampleEventNames.add);
                  });
                }

                return seq.Promise.resolve(true);
              }))
            .then(() => resolve(inst))
            .catch(reject);
          });
        } // tags changed

        return seq.Promise.resolve();
      }, // hooks.afterUpdate

      /**
       * When a publihsed aspect is deleted. Delete its entry in the aspectStore
       * and the sampleStore if any.
       *
       * @param {Aspect} inst - The deleted instance
       */
      afterDelete(inst /* , opts */) {
        if (inst.getDataValue('isPublished')) {
          if (featureToggles.isFeatureEnabled(sampleStoreFeature)) {
            // delete the entry in the aspectStore
            redisOps.deleteKey(aspectType, inst.name);

            // delete multiple possible entries in sampleStore
            redisOps.deleteKeys(sampleType, aspectType, inst.name);
          }
        }
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
    },
    paranoid: true,
  });

  return Aspect;
};
