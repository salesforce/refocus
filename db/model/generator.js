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
       * Accessed by API. if pass, return a Promise with the collectors.
       * If fail, return a rejected Promise
       *
       * @param {Array} collectorNames Array of strings
       * @param {Function} whereClauseForNameInArr Returns an object query
       * @returns {Promise} with collectors if pass, error if fail
       */
      validateCollectors(collectorNames, whereClauseForNameInArr) {
        return sgUtils.validateCollectors(seq, collectorNames,
          whereClauseForNameInArr);
      },

      /**
       * 1. validate the collectors field: if succeed, save the collectors in temp var for
       *  attaching to the generator. if fail, abort the operation
       * 2. create the generator
       * 3. add the saved collectors (if any)
       *
       * @param {Object} requestBody From API
       * @param {Function} whereClauseForNameInArr Returns an object query
       * @returns {Promise} created generator with collectors (if any)
       */
      createWithCollectors(requestBody, whereClauseForNameInArr) {
        let createdGenerator;
        let collectors; // will be populated with actual collectors
        return new seq.Promise((resolve, reject) =>
         sgUtils.validateCollectors(seq, requestBody.collectors,
            whereClauseForNameInArr)
          .then((_collectors) => {
            collectors = _collectors;
            return Generator.create(requestBody);
          })
          .then((_createdGenerator) => {
            createdGenerator = _createdGenerator;
            return _createdGenerator.addCollectors(collectors);
          })
          .then(() => resolve(createdGenerator.reload()))
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

      /**
       * 1. validate the collectors field: if succeed, save the collectors in
       *  temp var for attaching to the generator. if fail, abort the operation
       * 2. update the generator
       * 3. add the saved collectors (if any)
       *
       * @param {Object} requestBody From API
       * @param {Function} whereClauseForNameInArr Returns an object query
       * @returns {Promise} created generator with collectors (if any)
       */
      updateWithCollectors(requestBody, whereClauseForNameInArr) {
        let collectors; // will be populated with actual collectors
        return new seq.Promise((resolve, reject) =>
         sgUtils.validateCollectors(seq, requestBody.collectors,
            whereClauseForNameInArr)
          .then((_collectors) => {
            collectors = _collectors;
            return this.update(requestBody);
          })
          .then(() => this.addCollectors(collectors))
          .then(() => resolve(this.reload()))
          .catch(reject)
        );
      },

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
