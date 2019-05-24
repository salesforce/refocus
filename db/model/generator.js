/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/generator.js
 */
'use strict'; // eslint-disable-line strict
const common = require('../helpers/common');
const dbUtils = require('../utils');
const sgUtils = require('../helpers/generatorUtil');
const collectorUtils = require('../helpers/collectorUtils');
const conf = require('../../config');
const collectorConfig = require('../../config/collectorConfig');
const cryptUtils = require('../../utils/cryptUtils');
const activityLogUtil = require('../../utils/activityLog');
const constants = require('../constants');
const dbErrors = require('../dbErrors');
const hbUtils = require('../../api/v1/helpers/verbs/heartbeatUtils');
const ValidationError = dbErrors.ValidationError;
const semverRegex = require('semver-regex');
const featureToggles = require('feature-toggles');
const assoc = {};
const joi = require('joi');

const customVersionValidationSchema = joi.extend((joi) => ({
  base: joi.string(),
  name: 'version',
  language: {
    validateVersion: 'provide proper version',
  },
  rules: [
    {
      name: 'validateVersion',
      validate(params, value, state, options) {
        const versionValidate = semverRegex().test(value);
        if (!versionValidate) {
          return this.createError('version.validateVersion',
            { value }, state, options);
        }

        return value;
      },
    },
  ],
}));

const generatorTemplateSchema = joi.object().keys({
  name: joi.string().regex(constants.nameRegex)
    .max(constants.fieldlen.normalName).required()
    .description('GeneratorTemplate name associated with this generator'),
  version: customVersionValidationSchema.version().validateVersion()
    .required().description('Generator template version or version range'),
});

module.exports = function generator(seq, dataTypes) {
  const Generator = seq.define('Generator', {
    description: {
      type: dataTypes.TEXT,
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
    intervalSecs: {
      type: dataTypes.INTEGER,
      defaultValue: 60,
      validate: {
        isInt: true,
        min: 1,
      },
    },
    isDeleted: {
      type: dataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    isActive: {
      type: dataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lastUpsert: {
      type: dataTypes.DATE,
      allowNull: true,
    },
    name: {
      type: dataTypes.STRING(constants.fieldlen.normalName),
      allowNull: false,
      validate: {
        is: constants.nameRegex,
      },
    },
    subjectQuery: {
      type: dataTypes.STRING,
      allowNull: false,
      validate: {
        validateSQ(value) {
          sgUtils.validateSubjectQuery(value);
        },
      },
    },
    aspects: {
      type: dataTypes.ARRAY(dataTypes.STRING(constants.fieldlen.normalName)),
      allowNull: false,
      set(arr) {
        // store the aspect names in lowercase to allow case insensitivity
        this.setDataValue('aspects', arr.map(a => a.toLowerCase()));
      },
    },
    tags: {
      type: dataTypes.ARRAY(dataTypes.STRING(constants.fieldlen.normalName)),
      allowNull: false,
      defaultValue: constants.defaultArrayValue,
    },
    generatorTemplate: {
      type: dataTypes.JSON,
      allowNull: false,
      validate: {
        validateObject(value) {
          common.validateObject(value, generatorTemplateSchema);
        },
      },
    },
    connection: {
      type: dataTypes.JSON,
      allowNull: true,
    },
    context: {
      type: dataTypes.JSON,
      allowNull: true,
    },
  }, {
    hooks: {

      beforeCreate(inst /* , opts */) {
        const gtName = inst.generatorTemplate.name;
        const gtVersion = inst.generatorTemplate.version;
        return seq.models.GeneratorTemplate.getSemverMatch(gtName, gtVersion)
          .then((gt) => {
            if (!gt) {
              throw new ValidationError('No Generator Template matches ' +
                `name: ${gtName} and version: ${gtVersion}`);
            }

            sgUtils.validateGeneratorCtx(inst.context, gt.contextDefinition);
            return cryptUtils
              .encryptSGContextValues(seq.models.GlobalConfig, inst, gt)
              .catch(() => {
                throw new dbErrors.SampleGeneratorContextEncryptionError();
              });
          })
          .then(() => inst.assignToCollector());
      }, // beforeCreate

      beforeUpdate(inst /* , opts */) {
        const promises = [];

        /*
         Assign to collector in following cases:
         1) isActive is changed.
         2) collectorGroup is changed
         */
        if (inst.changed('isActive') || inst.changed('collectorGroup')) {
          promises.push(inst.assignToCollector()); // promise
        }

        if (inst.changed('generatorTemplate') || inst.changed('context')) {
          const gtName = inst.generatorTemplate.name;
          const gtVersion = inst.generatorTemplate.version;

          promises.push(seq.models.GeneratorTemplate // promise
            .getSemverMatch(gtName, gtVersion)
            .then((gt) => {
              if (!gt) {
                throw new ValidationError('No Generator Template matches ' +
                `name: ${gtName} and version: ${gtVersion}`);
              }

              sgUtils.validateGeneratorCtx(
                inst.context, gt.contextDefinition
              );

              return cryptUtils
                .encryptSGContextValues(seq.models.GlobalConfig, inst, gt)
                .catch(() => {
                  throw new dbErrors
                    .SampleGeneratorContextEncryptionError();
                });
            }));
        }

        return Promise.all(promises);
      }, // beforeUpdate

      beforeDestroy(inst /* , opts */) {
        return common.setIsDeleted(seq.Promise, inst);
      }, // beforeDestroy

      afterCreate(inst /* , opts*/) {
        return Promise.all([
          Promise.resolve().then(() => {
            if (inst.currentCollector) {
              const newCollector = inst.currentCollector.name;
              return hbUtils.trackGeneratorChanges(inst, null, newCollector);
            }
          }),
          Promise.resolve().then(() => {
            if (inst.createdBy) {
              return inst.addWriter(inst.createdBy);
            }
          }),
        ]);
      }, // afterCreate

      afterUpdate(inst) {
        const oldCollectorName = inst.previous('currentCollector') ?
                                 inst.previous('currentCollector').name : null;
        const newCollectorName = inst.currentCollector ?
                                 inst.currentCollector.name : null;
        return hbUtils.trackGeneratorChanges(
          inst, oldCollectorName, newCollectorName
        );
      }, //afterUpdate
    },
    validate: {
      isActiveAndCollectors() {
        const isActiveSet = this.changed('isActive') && this.isActive;
        const existingCollectors = this.collectorGroup && this.collectorGroup.collectors
          && this.collectorGroup.collectors.length;
        if (isActiveSet && !existingCollectors) {
          throw new ValidationError(
            'isActive can only be turned on if a collector group is ' +
            'specified with at least one collector.'
          );
        }
      },
    },
    indexes: [
      {
        name: 'GeneratorUniqueLowercaseNameIsDeleted',
        unique: true,
        fields: [
          seq.fn('lower', seq.col('name')),
          'isDeleted',
        ],
      },
    ],

    // defined here to be accessible in Collector.postImport()
    scopes: {
      embed: {
        attributes: ['id', 'name', 'description', 'isActive'],
        order: ['name'],
        include: [
          {
            model: seq.models.Collector.scope('embed'),
            as: 'currentCollector',
            required: false,
          },
          {
            model: seq.models.CollectorGroup.scope('embed'),
            as: 'collectorGroup',
            required: false,
          },
        ],
      },
    },

    paranoid: true,
  });

  /**
   * Class Methods:
   */

  Generator.getGeneratorAssociations = function () {
    return assoc;
  };

  Generator.getProfileAccessField = function () {
    return 'generatorAccess';
  };

  Generator.postImport = function (models) {
    assoc.collectorGroup = Generator.belongsTo(models.CollectorGroup, {
      as: 'collectorGroup',
      foreignKey: 'collectorGroupId',
    });

    assoc.owner = Generator.belongsTo(models.User, {
      foreignKey: 'ownerId',
      as: 'owner',
    });

    assoc.user = Generator.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'user',
    });

    assoc.currentCollector = Generator.belongsTo(models.Collector, {
      as: 'currentCollector',
      foreignKey: 'collectorId',
    });

    assoc.writers = Generator.belongsToMany(models.User, {
      as: 'writers',
      through: 'GeneratorWriters',
      foreignKey: 'generatorId',
    });

    Generator.addScope('baseScope', {
      order: ['name'],
    });

    Generator.addScope('user', {
      include: [
        {
          association: assoc.user,
          attributes: ['id', 'name', 'email', 'fullName'],
        },
      ],
    });

    Generator.addScope('owner', {
      include: [
        {
          association: assoc.owner,
          attributes: ['id', 'name', 'email', 'fullName'],
        },
      ],
    });

    Generator.addScope('currentCollector', {
      include: [
        {
          model: models.Collector.scope('embed'),
          as: 'currentCollector',
        },
      ],
    });

    Generator.addScope('collectorGroup', {
      include: [
        {
          model: models.CollectorGroup.scope('embed'),
          as: 'collectorGroup',
        },
      ],
    });

    Generator.addScope('defaultScope',
      dbUtils.combineScopes([
        'baseScope',
        'user',
        'owner',
        'currentCollector',
        'collectorGroup',
      ], Generator),
      { override: true }
    );
  };

  /**
   * Accessed by API. if pass, return a Promise with the collectors.
   * If fail, return a rejected Promise
   *
   * @param {Array} collectorNames Array of strings
   * @returns {Promise} with collectors if pass, error if fail
   */
  Generator.validateCollectors = function (collectorNames) {
    return collectorUtils.validate(seq, collectorNames);
  };

  /**
   * Accessed by API. if pass, return a Promise with the collectorGroup.
   * If fail, return a rejected Promise
   *
   * @param {String} collectorGroupName collectorGroup name
   * @returns {Promise} with collectorGroup if pass, error if fail
   */
  Generator.validateCollectorGroup = function (collectorGroupName) {
    return sgUtils.validateCollectorGroup(seq, collectorGroupName);
  };

  /**
   * 1. validate the collectors field: if succeed, save the collectors in temp
   * var for attaching to the generator. if fail, abort the operation
   * 2. create the generator
   * 3. add the saved collectors (if any)
   *
   * @param {Object} requestBody From API
   * @returns {Promise} created generator with collectors (if any)
   */

  Generator.createWithCollectors = function (requestBody) {
    let collectorGroup;

    return Promise.resolve()
    .then(() => sgUtils.validateCollectorGroup(seq, requestBody.collectorGroup))
    .then((_cg) => collectorGroup = _cg)
    .then(() => Generator.build(requestBody))
    .then((gen) => {
      // mock for validation.
      gen.collectorGroup = collectorGroup;
      return gen.save();
    })
    .then((gen) => gen.setCollectorGroup(collectorGroup))
    .then((gen) => gen.reload(Generator.options.defaultScope));
  };

  Generator.findForHeartbeat = function (findOpts) {
    return Generator.findAll(findOpts)
    .then((gens) => gens.map((g) => g.updateForHeartbeat()))
    .then((genpromises) => Promise.all(genpromises));
  }; // findForHeartbeat

  /**
   * Checks for generators that have missed their sample upsert, and reassigns to another collector.
   *
   * @returns {Promise<Array<Generator>>}
   */
  Generator.checkMissedUpsert = function () {
    return Generator.findAll()
    .then((gens) => gens.filter((g) => g.shouldReassign()))
    .map((gen) => {
      logMissedUpsert(gen);
      return gen.assignToCollector().then(() => gen.save());
    });
  }; // checkMissedUpsert

  function logMissedUpsert(gen) {
    const logObj = {
      generator: gen.name,
      gtName: gen.generatorTemplate && gen.generatorTemplate.name,
      gtVersion: gen.generatorTemplate && gen.generatorTemplate.version,
      currentCollector: gen.currentCollector && gen.currentCollector.name,
      lastUpsert: gen.lastUpsert && gen.lastUpsert.getTime(),
      delta: gen.lastUpsert && Date.now() - gen.lastUpsert.getTime(),
    };

    activityLogUtil.printActivityLogString(logObj, 'missedUpsert');
  } // logMissedUpsert

  /**
   * Instance Methods:
   */

  /**
   * 1. validate the collectors field: if succeed, save the collectors in
   *  temp var for attaching to the generator. if fail, abort the operation
   * 2. add the saved collectors (if any)
   * 3. update the generator
   *
   * @param {Object} requestBody From API
   * @returns {Promise} created generator with collectors (if any)
   */
  Generator.prototype.updateWithCollectors = function (requestBody) {
    return Promise.resolve()

    .then(() => sgUtils.validateCollectorGroup(seq, requestBody.collectorGroup))
    .then((collectorGroup) => {
      if (collectorGroup) {
        // prevent overwrite of reloaded collectorGroup on update
        delete requestBody.collectorGroup;

        // mock collectorGroup on instance so we don't need to reload
        // again to get the currentCollector (this matters if we try to set
        // isActive=true and set the collectorGroup at the same time)
        this.collectorGroup = collectorGroup;
        return this.setCollectorGroup(collectorGroup);
      }
    })
    .then(() => this.update(requestBody))
    .then(() => this.reload(Generator.options.defaultScope));
  };

  /**
   * Determines whether the time since the last sample upsert is within
   * the latency tolerance.
   *
   * @returns {Boolean}
   */
  Generator.prototype.shouldReassign = function () {
    if (!this.currentCollector || !this.lastUpsert) return false;

    const expectedInterval = this.intervalSecs * 1000;
    const toleranceFactor = conf.generatorUpsertToleranceFactor;
    const retries = conf.generatorMissedUpsertRetries;
    const jobInterval = collectorConfig.heartbeatIntervalMillis;
    const timeSinceUpsert = Date.now() - this.lastUpsert.getTime();
    const upsertTolerance = expectedInterval * toleranceFactor;

    /* The time in ms the generator is over the upsert tolerance by. */
    const delta = timeSinceUpsert - upsertTolerance;

    /*
     * The time past the upsert tolerance we should keep trying to reassign for.
     * Once a generator has stopped, and if reassigning fails to fix it, it will
     * be reassigned every interval when the job runs.
     * This is necessary to prevent failing generators from being bounced around indefinitely.
     */
    const retryCap = jobInterval * retries;

    /* Reassign the generator if it is over the upsert tolerance but not over the retry cap. */
    return 0 < delta && delta < retryCap;
  }; // shouldReassign

  Generator.prototype.isWritableBy = function (who) {
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

  /**
   * Replaces string array of aspect names with object array of aspect
   * records (with only the "name" attribute).
   * Replaces generatorTemplate (name/version) with full generator template
   * record.
   *
   * @returns {Generator} - the updated Generator
   */
  Generator.prototype.updateForHeartbeat = function () {
    const jwtUtil = require('../../utils/jwtUtil');
    const g = this.get();
    const aspects = g.aspects.map((a) => ({ name: a }));
    g.aspects = aspects;
    g.token = jwtUtil.createToken(g.name, g.user.name, { IsGenerator: true });
    const gt = g.generatorTemplate;
    return seq.models.GeneratorTemplate.getSemverMatch(gt.name, gt.version)
    .then((t) => {
      if (t) g.generatorTemplate = t.get();
    })
    .then(() => g);
  }; // updateForHeartbeat

  /**
   * Out of all the possible collectors that are running and alive, find the
   * one with the fewest number of currently assigned generators. Break ties
   * based on the collector name.
   * @param  {Array} collectors - Array of collector objects
   * @param  {Collector} currentCollector - The collector the generator is assigned to.
   * @return {Promise} - Resolves to most available collector found
   */
  function getMostAvailableCollector(collectors, currentCollector) {
    // get alive and running collectors
    let upCollectors = collectors.filter((c) =>
     c.isRunning() && c.isAlive());

    if (upCollectors.length === 0) { // no alive/running collectors
      return Promise.resolve();
    }

    // make sure we don't assign back to the same one, unless it's the only option
    if (currentCollector && upCollectors.length !== 1) {
      upCollectors = upCollectors.filter((coll) =>
        coll.name !== currentCollector.name
      );
    }

    const promises = [];

    /* For all collectors, create a map of collector and its corresponding
     current generators */
    for (let i = 0; i < upCollectors.length; i++) {
      const ithCollector = upCollectors[i];
      let promise;

      // If current generators are present in ithCollector object, just return the map.
      if (ithCollector.currentGenerators) {
        promise = Promise.resolve({
          collector: ithCollector,
          numCurrentGen: ithCollector.currentGenerators.length,
        });
      } else {

        // If current generators info not in obj, get the info from db
        promise = dbUtils.seq.models.Collector.findByPk(ithCollector.id)
        .then((c) => {
          let numCurrGen = 0;

          if (c.currentGenerators) {
            numCurrGen = c.currentGenerators.length;
          }

          return Promise.resolve({
            collector: c,
            numCurrentGen: numCurrGen,
          });
        });
      }

      promises.push(promise);
    }

    return Promise.all(promises)
    .then((collectorInfoArr) => {
      if (!collectorInfoArr.length) {
        return Promise.resolve();
      }

      // find collector with least number of current generators
      let mostAvailCollectorInfo = collectorInfoArr[0];
      for (let i = 1; i < collectorInfoArr.length; i++) {
        const numCurrGenInBestColl = mostAvailCollectorInfo.numCurrentGen;
        const numCurrGenInIthColl = collectorInfoArr[i].numCurrentGen;

        /* if number of assigned generators in this collector is less than
        mostAvailCollector, update mostAvailCollector to this one */
        if (numCurrGenInIthColl < numCurrGenInBestColl) {
          mostAvailCollectorInfo = collectorInfoArr[i];
        } else if ((numCurrGenInIthColl === numCurrGenInBestColl) &&
          (collectorInfoArr[i].collector.name < mostAvailCollectorInfo.collector.name)) {
          /* if number of assigned generators in this collector is equal to
          mostAvailCollector, then break ties based on the collector name */
          mostAvailCollectorInfo = collectorInfoArr[i];
        }
      }

      return Promise.resolve(mostAvailCollectorInfo.collector);
    });
  } // getMostAvailableCollector

  /**
   * Assigns the generator to an available collector.
   * If the generator specifies a "collectors" attribute, only collectors on that
   * list may be assigned. Otherwise, any collector may be used.
   * Note that this doesn't save the change to the db, it only updates the
   * currentCollector field and expects the caller to save later.
   */
  Generator.prototype.assignToCollector = function () {
    return Promise.resolve()
    .then(() => {
      const collectorGroup = this.collectorGroup;
      const potentialCollectors = collectorGroup && collectorGroup.collectors;
      if (this.isActive && potentialCollectors && potentialCollectors.length) {
        return getMostAvailableCollector(potentialCollectors, this.currentCollector);
      }

      return Promise.resolve();
    })
    .then((mostAvailCollector) => {
      logAssignment(this.name, this.currentCollector, mostAvailCollector);

      // Doing setCurrentCollector would result in redundant db saves and
      // complicate the hook logic. Instead, we mock it here and save later.
      this.collectorId = mostAvailCollector ? mostAvailCollector.id : null;
      this.currentCollector = mostAvailCollector || null;
      this._changed.collectorId = true;

      // reset lastUpsert when unassigned
      if (!this.currentCollector) {
        this.lastUpsert = null;
      }
    });
  }; // assignToCollector

  function logAssignment(gen, prevColl, newColl) {
    prevColl = prevColl && prevColl.name || null;
    newColl = newColl && newColl.name || null;

    let action;
    let type;
    if (!prevColl && newColl) {
      type = 'assigned';
      action = `assigned_to_${newColl}`;
    } else if (prevColl && !newColl) {
      type = 'unassigned';
      action = `unassigned_from_${prevColl}`;
    } else if (prevColl && newColl) {
      type = 'reassigned';
      action = `${prevColl}->${newColl}`;
    }

    if (featureToggles.isFeatureEnabled('enableCollectorAssignmentLogs')) {
      const logObj = {
        generator: gen,
        action,
        type,
        previousCollector: prevColl,
        newCollector: newColl,
      };
      activityLogUtil.printActivityLogString(logObj, 'collectorAssignment');
    }
  } // logAssignment

  return Generator;
};
