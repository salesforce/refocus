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
const sgUtils = require('../helpers/generatorUtil');
const cryptUtils = require('../../utils/cryptUtils');
const constants = require('../constants');
const dbErrors = require('../dbErrors');
const hbUtils = require('../../api/v1/helpers/verbs/heartbeatUtils');
const ValidationError = dbErrors.ValidationError;
const semverRegex = require('semver-regex');
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
    name: {
      type: dataTypes.STRING(constants.fieldlen.normalName),
      allowNull: false,
      validate: {
        is: constants.nameRegex,
      },
    },
    subjectQuery: {
      type: dataTypes.STRING,
      validate: {
        validateSQ(value) {
          sgUtils.validateSubjectQuery(value);
        },
      },
    },
    subjects: {
      type: dataTypes.ARRAY(dataTypes.STRING(constants.fieldlen.normalName)),
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
      allowNull: true,
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
    currentCollector: {
      type: dataTypes.STRING(constants.fieldlen.normalName),
      allowNull: true,
      validate: {
        is: constants.nameRegex,
      },
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
          });
      }, // beforeCreate

      beforeUpdate(inst /* , opts */) {
        const gtName = inst.generatorTemplate.name;
        const gtVersion = inst.generatorTemplate.version;

        /*
         inst.get('possibleCollectors') would work instead of
         inst.possibleCollectors because we set collectors in place at api layer
         using instance.setDataValue('possibleCollectors', ...);
         */
        // console.log(inst);
        let isCurrentCollectorIncluded = false;
        if (inst.get('possibleCollectors')) {
          isCurrentCollectorIncluded = inst.get('possibleCollectors').some(
            (coll) => coll.name === inst.currentCollector
          );
        }

        if (inst.changed('isActive') ||
         (inst.changed('possibleCollectors') && !isCurrentCollectorIncluded)) {
          inst.assignToCollector();
        }

        if (inst.changed('generatorTemplate') || inst.changed('context')) {
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
            });
        }

        return inst;
      }, // beforeUpdate

      beforeDestroy(inst /* , opts */) {
        return common.setIsDeleted(seq.Promise, inst);
      }, // beforeDestroy

      afterCreate(inst /* , opts*/) {
        // inst.assignToCollector();
        return Promise.all([
          Promise.resolve().then(() => {
            if (inst.currentCollector) {
              const newCollector = inst.currentCollector;
              return hbUtils.trackGeneratorChanges(inst, null, newCollector);
            }
          }),
          Promise.resolve().then(() => {
            if (inst.createdBy) {
              return inst.addWriter(inst.createdBy);
            }
          }),
          // inst.save(),
        ]);
      }, // afterCreate

      afterUpdate(inst) {
        const oldCollector = inst.previous('currentCollector');
        const newCollector = inst.get('currentCollector');

        return Promise.all([
          hbUtils.trackGeneratorChanges(inst, oldCollector, newCollector),
        ]);
      }, //afterUpdate
    },
    validate: {
      eitherSubjectsORsubjectQuery() {
        if (this.subjects && this.subjectQuery ||
            (!this.subjects && !this.subjectQuery)) {
          throw new ValidationError('Only one of ["subjects", ' +
            '"subjectQuery"] is required');
        }
      },

      isActiveAndCollectors() {
        const isActiveSet = this.changed('isActive') && this.isActive;
        const existingCollectors = this.possibleCollectors && this.possibleCollectors.length;
        if (isActiveSet && !existingCollectors) {
          throw new ValidationError(
            'isActive can only be turned on if at least one collector is specified.'
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
    assoc.user = Generator.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'user',
    });

    assoc.possibleCollectors = Generator.belongsToMany(models.Collector, {
      as: 'possibleCollectors',
      through: 'GeneratorCollectors',
      foreignKey: 'generatorId',
      // hooks: true,
    });

    // assoc.currentCollector = Generator.belongsTo(models.Collector, {
    //   as: 'currentCollector',
    //   foreignKey: 'collectorId',
    // });

    assoc.writers = Generator.belongsToMany(models.User, {
      as: 'writers',
      through: 'GeneratorWriters',
      foreignKey: 'generatorId',
    });

    Generator.addScope('baseScope', {
      order: ['name'],
    });

    Generator.addScope('defaultScope', {
      include: [
        {
          association: assoc.user,
          attributes: ['name', 'email', 'fullName'],
        },
        {
          association: assoc.possibleCollectors,
          attributes: [
            'id',
            'name',
            'registered',
            'status',
            'lastHeartbeat',
            'isDeleted',
            'createdAt',
            'updatedAt',
          ],
        },
      ],
      order: ['name'],
    }, {
      override: true,
    });

    Generator.addScope('user', {
      include: [
        {
          association: assoc.user,
          attributes: ['name', 'email', 'fullName'],
        },
      ],
    });

    Generator.addScope('possibleCollectors', {
      include: [
        {
          /*
            According to Sequelize team when limits are set, they enforce the
            usage of sub-queries, however, when Generator has multiple
            associations (ie.: Collectors and User) the sub-query does not
            expose foreign keys (Generator.createdBy).

            Sequelize by default will try to create subQuery even when there is
            no subQuery configured because the duplication flag is true by
            default.

            So, flagging duplication=false makes Sequelize avoid cartesian
            product not generating sub-queries (further check in:
            /sequelize/model.js, line 441).
          */
          duplicating: false,
          association: assoc.possibleCollectors,
          attributes: [
            'id',
            'name',
            'registered',
            'status',
            'lastHeartbeat',
            'isDeleted',
            'createdAt',
            'updatedAt',
          ],
        },
      ],
    });
  };

  /**
   * Accessed by API. if pass, return a Promise with the collectors.
   * If fail, return a rejected Promise
   *
   * @param {Array} collectorNames Array of strings
   * @returns {Promise} with collectors if pass, error if fail
   */
  Generator.validateCollectors = function (collectorNames) {
    return sgUtils.validateCollectors(seq, collectorNames);
  };

  /**
   * 1. validate the collectors field: if succeed, save the collectors in temp var for
   *  attaching to the generator. if fail, abort the operation
   * 2. create the generator
   * 3. add the saved collectors (if any)
   *
   * @param {Object} requestBody From API
   * @returns {Promise} created generator with collectors (if any)
   */
  Generator.createWithCollectors = function (requestBody) {
    let createdGenerator;
    let collectors;

    return Promise.resolve()
    .then(() => sgUtils.validateCollectors(seq, requestBody.possibleCollectors))
    .then((_collectors) => collectors = _collectors)
    .then(() => createdGenerator = Generator.build(requestBody))
    .then(() => createdGenerator.possibleCollectors = collectors) // mock for validation
    .then(() => createdGenerator.save())
    .then((gen) => createdGenerator = gen)
    .then(() => createdGenerator.addPossibleCollectors(collectors))
    .then(() => createdGenerator.reload());
  };

  Generator.findForHeartbeat = function (findOpts) {
    return Generator.findAll(findOpts)
    .then((gens) => gens.map((g) => g.updateForHeartbeat()))
    .then((genpromises) => Promise.all(genpromises));
  }; // findForHeartbeat

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
    .then(() => sgUtils.validateCollectors(seq, requestBody.possibleCollectors))
    .then((collectors) => this.addPossibleCollectors(collectors))
    .then(() => this.update(requestBody))
    .then(() => this.reload());
  };

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
    const g = this.get();
    const aspects = g.aspects.map((a) => ({ name: a }));
    g.aspects = aspects;

    const gt = g.generatorTemplate;
    return seq.models.GeneratorTemplate.getSemverMatch(gt.name, gt.version)
    .then((t) => {
      if (t) g.generatorTemplate = t.get();
    })
    .then(() => g);
  }; // updateForHeartbeat

  /**
   * Assigns the generator to an available collector.
   * If the generator specifies a "collectors" attribute, only collectors on that
   * list may be assigned. Otherwise, any collector may be used.
   * Note that this doesn't save the change to the db, it only updates the
   * currentCollector field and expects the caller to save later.
   */
  Generator.prototype.assignToCollector = function () {
    /*
     inst.get('possibleCollectors') would work instead of
     inst.possibleCollectors because we set collectors in place at api layer
     using instance.setDataValue('possibleCollectors', ...);
     */
    const instCollectors = this.get('possibleCollectors');
    if (this.isActive && instCollectors && instCollectors.length) {
      instCollectors.sort((c1, c2) => c1.name > c2.name);
      const newColl = instCollectors.find((c) => c.isRunning() && c.isAlive());
      this.currentCollector = newColl ? newColl.name : null;
    } else {
      this.currentCollector = null;
    }
  };
};
