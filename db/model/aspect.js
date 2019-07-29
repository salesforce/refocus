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
const Promise = require('bluebird');
const Op = require('sequelize').Op;
const publishSample = require('../../realtime/redisPublisher').publishSample;
const publishObject = require('../../realtime/redisPublisher').publishObject;
const realtimeConstants = require('../../realtime/constants');
const aspectEventNames = realtimeConstants.events.aspect;
const sampleEventNames = realtimeConstants.events.sample;

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
      type: dataTypes.ENUM(
        u.aspValueTypes.boolean,
        u.aspValueTypes.numeric,
        u.aspValueTypes.percent
      ),
      defaultValue: u.aspValueTypes.boolean,
    },
    relatedLinks: {
      type: dataTypes.ARRAY(dataTypes.JSON),
      allowNull: false,
      defaultValue: constants.defaultJsonArrayValue,
      validate: {
        validateJsonSchema(value) {
          common.validateJsonSchema(value);
        },
      },
    },
    tags: {
      type: dataTypes.ARRAY(dataTypes.STRING(constants.fieldlen.normalName)),
      allowNull: false,
      defaultValue: constants.defaultArrayValue,
    },
  }, {
    hooks: {
      beforeCreate(inst /* , opts */) {
        u.validateAspectStatusRanges(inst);
      }, // hooks.beforeCreate
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
        return Promise.all([
          inst.isPublished && publishObject(inst, aspectEventNames.add),
          redisOps.addKey(aspectType, inst.getDataValue('name')),
          redisOps.hmSet(aspectType, inst.name, instDataObj),
          redisOps.setWriters(inst),
          redisOps.setRanges(inst),
          redisOps.setTags(inst),
        ]);
      }, // hooks.afterCreate

      /**
       * Check Generator references. If aspect is deleted then send realtime
       * "del" event to delete all samples associated with that aspect for
       * perspectives.
       *
       * @param {Aspect} inst - The instance being destroyed
       * @returns {Promise}
       */
      beforeDestroy(inst /* , opts */) {
        return inst.checkGeneratorReferences('delete');
      }, // hooks.beforeDestroy

      /**
       * Check Generator references before unpublishing or renaming
       * @param {Aspect} inst - The instance being updated
       * @returns {Promise}
       */
      beforeUpdate(inst /* , opts */) {
        u.validateAspectStatusRanges(inst);
        const promiseArr = [];
        const unpublished = inst.previous('isPublished') && !inst.isPublished;
        const renamed = inst.previous('name') !== inst.name;
        if (unpublished || renamed) {
          const action = unpublished ? 'unpublish' : 'rename';
          promiseArr.push(inst.checkGeneratorReferences(action));
        }

        /*
         * If aspect is published and tags change or unpublished,
         * send a "del" realtime event for all the
         * samples for this aspect. (The afterUpdate hook
         * will send an "add" event.) This way, perspectives
         * which filter by aspect tags will get the right samples.
         */
        if (inst.isPublished && common.tagsChanged(inst) ||
          (inst.changed('isPublished') && inst.previous('isPublished'))) {
          promiseArr.push(redisOps.getSamplesFromAspectName(inst.name)
            .each((samp) => {
              if (samp) {
                publishSample(samp, sampleEventNames.del);
              }
            })
          );
        } // tags changed

        return seq.Promise.all(promiseArr);
      }, // hooks.beforeUpdate

      /**
       * If isPublished is being updated from true to false or the name of the
       * aspect is changed, delete any samples associated with the aspect.
       *
       * @param {Aspect} inst - The updated instance
       * @returns {Promise}
       */
      afterUpdate(inst /* , opts */) {
        const promiseArr = [];
        const cmds = [];
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

          // duplicate aspect-to-subject resource map with new name
          promiseArr.push(redisOps.executeCommand(redisOps.duplicateSet(
            redisOps.aspSubMapType, newAspName, oldAspectName
          )));

          // add new aspect name entries to subject-to-aspect resource maps
          promiseArr.push(
            redisOps.executeCommand(
              redisOps.getAspSubjMapMembers(oldAspectName)
            )
            .map((subjAbsPath) => cmds.push(redisOps.addAspectNameInSubjectSet(
              subjAbsPath, newAspName)))
          );

          /*
           * delete multiple possible sample entries in the sample master
           * list of index and the related sample hashes. Deletes old aspect
           * name from subject-to-aspect resource maps. Deletes aspect-to-
           * subject resource map with old aspect name as key.
           */
          promiseArr.push(u.removeAspectRelatedSamples(
            inst._previousDataValues, seq));

          promiseArr.push(publishObject(inst._previousDataValues,
            aspectEventNames.del));
          promiseArr.push(publishObject(inst, aspectEventNames.add));
        } else if (isPublishedChanged) {
          // Prevent any changes to original inst dataValues object
          const instDataObj = JSON.parse(JSON.stringify(inst.get()));
          promiseArr.push(redisOps.hmSet(aspectType, inst.name, instDataObj));

          // add the aspect to the aspect master list regardless of isPublished
          promiseArr.push(redisOps.addKey(aspectType, inst.name));
          if (inst.isPublished) {
            promiseArr.push(publishObject(inst, aspectEventNames.add));
          } else {
            /*
             * delete multiple possible sample entries in the sample master
             * list of index and the related sample hashes. Deletes aspect
             * name from subject-to-aspect resource maps. Deletes aspect-to-
             * subject resource map with aspect name as key.
             */
            promiseArr.push(u.removeAspectRelatedSamples(inst.dataValues, seq));
            promiseArr.push(publishObject(inst, aspectEventNames.del));
          }
        } else if (inst.isPublished) {
          const instChanged = {};
          Object.keys(inst._changed)
          .filter((key) => inst._changed[key])
          .forEach((key) => {
            instChanged[key] = inst[key];
          });
          promiseArr.push(redisOps.hmSet(aspectType, inst.name, instChanged));

          if (common.tagsChanged(inst)) {
            promiseArr.push(publishObject(inst._previousDataValues,
              aspectEventNames.del));
            promiseArr.push(publishObject(inst, aspectEventNames.add));
          } else {
            promiseArr.push(publishObject(inst, aspectEventNames.upd,
              Object.keys(inst._changed), []));
          }
        }

        /*
         * If aspect is published and tags change, send an "add" realtime
         * event for all the samples for this aspect. (The beforeUpdate hook
         * will already have sent a "delete" event.) This way, perspectives
         * which filter by aspect tags will get the right samples.
         */
        if (inst.isPublished && common.tagsChanged(inst)) {
          promiseArr.push(redisOps.getSamplesFromAspectName(inst.name)
            .each((samp) => {
              if (samp) {
                publishSample(samp, sampleEventNames.add);
              }
            })
          );
        } // tags changed

        /* If aspect is published and any status range changes, delete the
         samples. Let the next new sample come in and recalculate status based
         on the new ranges.
         */
        if (inst.isPublished && (inst.changed('criticalRange') ||
         inst.changed('warningRange') || inst.changed('infoRange') ||
        inst.changed('okRange'))) {
          promiseArr.push(u.removeAspectRelatedSamples(inst.dataValues, seq));
        }

        return seq.Promise.all(promiseArr)
          .then(() => redisOps.executeBatchCmds(cmds));
      }, // hooks.afterUpdate

      /**
       * When a publihsed aspect is deleted. Delete its entry in the aspectStore
       * and the sampleStore if any.
       * Delete multiple possible sample entries in the sample master
       * list of index and the related sample hashes. Deletes aspect
       * name from subject-to-aspect resource maps. Deletes aspect-to-
       * subject resource map with aspect name as key.
       *
       * @param {Aspect} inst - The deleted instance
       * @returns {Promise}
       */
      afterDestroy(inst /* , opts */) {
        const promises = [
          redisOps.deleteKey(aspectType, inst.name),
          u.removeAspectRelatedSamples(inst.dataValues, seq),
        ];
        if (inst.getDataValue('isPublished')) {
          promises.push(publishObject(inst, aspectEventNames.del));
        }

        return Promise.all(promises);
      }, // hooks.afterDestroy

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
        name: 'AspectUniqueLowercaseName',
        unique: true,
        fields: [seq.fn('lower', seq.col('name'))],
      },
    ],
  });

  /**
   * Class Methods:
   */

  Aspect.getAspectAssociations = function () {
    return assoc;
  };

  Aspect.getProfileAccessField = function () {
    return 'aspectAccess';
  };

  Aspect.postImport = function (models) {
    assoc.owner = Aspect.belongsTo(models.User, {
      foreignKey: 'ownerId',
      as: 'owner',
    });
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

    Aspect.addScope('baseScope', {
      order: seq.col('name'),
    });

    Aspect.addScope('defaultScope', {
      include: [
        {
          association: assoc.user,
          attributes: ['id', 'name', 'email', 'fullName'],
        },
        {
          association: assoc.owner,
          attributes: ['id', 'name', 'email', 'fullName'],
        },
      ],
      order: seq.col('name'),
    }, {
      override: true,
    });

    Aspect.addScope('owner', {
      include: [
        {
          association: assoc.owner,
          attributes: ['id', 'name', 'email', 'fullName'],
        },
      ],
    });

    Aspect.addScope('user', {
      include: [
        {
          association: assoc.user,
          attributes: ['id', 'name', 'email', 'fullName'],
        },
      ],
    });

    Aspect.addScope('forRealTime', (value) => ({
      where: {
        name: { [Op.iLike]: value },
      },
      include: [
        {
          association: assoc.user,
          attributes: ['id', 'name', 'email', 'fullName'],
        },
      ],
    }));
  };

  /**
   * Instance Methods:
   */

  Aspect.prototype.isWritableBy = function (who) {
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
  }; // isWritableBy

  Aspect.prototype.checkGeneratorReferences = function (action) {
    const aspectName = this.previous('name');

    // the aspect names are stored in lowercase on the generator
    const where = { aspects: { [Op.contains]: [aspectName.toLowerCase()] } };
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
  };

  return Aspect;
};
