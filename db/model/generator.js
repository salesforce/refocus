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
const common = require('../helpers/common');
const cryptUtils = require('../../utils/cryptUtils');
const constants = require('../constants');
const dbErrors = require('../dbErrors');
const ValidationError = dbErrors.ValidationError;
const semverRegex = require('semver-regex');
const assoc = {};

const generatorTemplateSchema = {
  properties: {
    name: {
      description: 'GeneratorTemplate name associated with this generator',
      type: 'string',
      maxLength: constants.fieldlen.normalName,
      pattern: constants.nameRegex,
      required: true,
    },
    version: {
      description: 'Generator template version or version range',
      type: 'string',
      require: true,
      conform: (thisVersion) => semverRegex().test(thisVersion),
      message: 'The version must match the semantic version format',
    },
  },
};

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
    },
    subjects: {
      type: dataTypes.ARRAY(dataTypes.STRING(constants.fieldlen.normalName)),
    },
    aspects: {
      type: dataTypes.ARRAY(dataTypes.STRING(constants.fieldlen.normalName)),
      allowNull: false,
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
  }, {
    classMethods: {
      getGeneratorAssociations() {
        return assoc;
      },

      getProfileAccessField() {
        return 'generatorAccess';
      },

      postImport(models) {
        assoc.user = Generator.belongsTo(models.User, {
          foreignKey: 'createdBy',
          as: 'user',
        });

        assoc.collectors = Generator.belongsToMany(models.Collector, {
          as: 'collectors',
          through: 'GeneratorCollectors',
          foreignKey: 'generatorId',
        });

        assoc.writers = Generator.belongsToMany(models.User, {
          as: 'writers',
          through: 'GeneratorWriters',
          foreignKey: 'generatorId',
        });

        Generator.addScope('defaultScope', {
          include: [
            {
              association: assoc.user,
              attributes: ['name', 'email'],
            },
            {
              association: assoc.collectors,
              attributes: [
                'id',
                'name',
                'registered',
                'status',
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
      },

      /**
       * 1. validate the collectors field: if succeed, save the collectors in temp var for
       *  attaching to the generator. if fail, abort the PATCH operation
       * 2. update the generator
       * 3. add the saved collectors (if any)
       *
       * @param {Object} requestBody From API
       * @returns {Promise} created generator with collectors (if any)
       */
      patchWithCollectors(requestBody) {
      },

      /**
       * 1. validate the collectors field: if succeed, save the collectors in temp var for
       *  attaching to the generator. if fail, abort the POST operation
       * 2. create the generator
       * 3. add the saved collectors (if any)
       *
       * @param {Object} requestBody From API
       * @param {Function} whereClauseForNameInArr Returns an object query
       * @returns {Promise} created generator with collectors (if any)
       */
      createWithCollectors(requestBody, whereClauseForNameInArr) {
        const options = {};
        let collectors; // will be populated with actual collectors
        options.where = whereClauseForNameInArr(requestBody.collectors || []);
        return new seq.Promise((resolve, reject) =>
          seq.models.Collector.findAll(options)
          .then((_collectors) => {

            /*
             * If requestBody does not have a collectors field, OR
             * if the number of collectors in requestBody MATCH the
             * GET result, order the collectors AND create the generator.
             * Else throw error since there are collectors that don't exist.
             */
            if (!requestBody.collectors ||
              (_collectors.length === requestBody.collectors.length)) {
              collectors = common
                .sortArrayAccordingToAnotherArray(_collectors, requestBody.collectors);
              return Generator.create(requestBody);
            }

            const err = new dbErrors.ResourceNotFoundError();
            err.resourceType = 'Collector';
            err.resourceKey = requestBody.collectors;
            throw err;
          }) // if successful create, add collectors
          .then((createdGenerator) => createdGenerator.addCollectors(collectors))
          .then(() => Generator.findOne({ where: { name: requestBody.name } }))
          .then((findresult) => resolve(findresult.reload()))
          .catch(reject)
        );
      },
    },

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
        if (inst.changed('generatorTemplate') || inst.changed('context')) {
          return seq.models.GeneratorTemplate.getSemverMatch(gtName, gtVersion)
            .then((gt) => {
              if (!gt) {
                throw new ValidationError('No Generator Template matches ' +
                `name: ${gtName} and version: ${gtVersion}`);
              }

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
        if (inst.createdBy) {
          return new seq.Promise((resolve, reject) =>
            inst.addWriter(inst.createdBy)
            .then(() => resolve(inst))
            .catch((err) => reject(err))
          );
        }

        return inst;
      }, // afterCreate
    },
    validate: {
      eitherSubjectsORsubjectQuery() {
        if (this.subjects && this.subjectQuery ||
            (!this.subjects && !this.subjectQuery)) {
          throw new ValidationError('Only one of ["subjects", ' +
            '"subjectQuery"] is required');
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
  return Generator;
};
