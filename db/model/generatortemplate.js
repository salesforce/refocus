/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/generatortemplate.js
 */
const common = require('../helpers/common');
const constants = require('../constants');
const ValidationError = require('../dbErrors').ValidationError;
const semver = require('semver');
const joi = require('joi');
const assoc = {};

const authorSchema = joi.object().keys({
  url: joi.string().uri().description('Optional Url given by the author')
    .optional(),
  name: joi.string().max(constants.fieldlen.normalName).required()
    .description('Name of the author'),
  email: joi.string().email().required()
    .description('Author\'s email address'),
});

const repositorySchema = joi.object().keys({
  url: joi.string().uri({ scheme: ['git', /git\+https?/, 'https', 'http'], })
    .description('Url repository'),
  type: joi.string().max(constants.fieldlen.normalName)
    .description('Type of the version control system'),
});

const connectionSchema = joi.object().keys({
  method: joi.string().valid(['DELETE', 'GET', 'PATCH', 'POST', 'PUT'])
    .required().description('The http method'),
  url: joi.string()
    .description('The url to connect to. Specify variables for variable' +
      'expansion using double curly braces. One of ' +
      '["url", "toUrl"] is required.'),
  toUrl: joi.any().description('The string body of a function which returns ' +
    'the url to connect to. One of ["url", "toUrl"] is required'),
  proxy: joi.string()
    .description('The Proxy server for the http request, if needed'),
  headers: joi.object().description('Optional connection headers'),
  bulk: joi.boolean().default(false)
    .description('Set to false if you want to send one request for each of' +
    'the designated subjects. Set to true if you want to collect data for ' +
    'all of the designated subjects in a single request. When set to true, ' +
    'the url string or url function may only reference context attributes ' +
    'with defaults.'),
});

const ctxDefRequiredProps = ['description'];

module.exports = function user(seq, dataTypes) {
  const GeneratorTemplate = seq.define('GeneratorTemplate', {
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
    name: {
      type: dataTypes.STRING(constants.fieldlen.normalName),
      allowNull: false,
      validate: {
        is: constants.nameRegex,
      },
    },
    version: {
      defaultValue: '1.0.0',
      type: dataTypes.STRING(constants.fieldlen.shortish),
      validate: {
        is: constants.versionRegex,
      },
    },
    tags: {
      type: dataTypes.ARRAY(dataTypes.STRING(constants.fieldlen.normalName)),
      allowNull: true,
      defaultValue: constants.defaultArrayValue,
    },
    author: {
      type: dataTypes.JSON,
      allowedNull: false,
      validate: {
        validateObject(value) {
          common.validateObject(value, authorSchema);
        },
      },
    },
    repository: {
      type: dataTypes.JSON,
      allowNull: true,
      validate: {
        validateObject(value) {
          common.validateObject(value, repositorySchema);
        },
      },
    },
    connection: {
      type: dataTypes.JSON,
      allowNull: true,
      validate: {
        validateObject(value) {
          common.validateObject(value, connectionSchema);
        },
      },
    },
    contextDefinition: {
      type: dataTypes.JSON,
      allowNull: true,
      validate: {
        validateObject(value) {
          common.validateContextDef(value, ctxDefRequiredProps);
        },
      },
    },
    transform: {
      type: dataTypes.TEXT,
      allowNull: false,
    },
    isPublished: {
      type: dataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  }, {
    classMethods: {
      getGeneratortemplateAssociations() {
        return assoc;
      },

      getProfileAccessField() {
        return 'generatorTemplateAccess';
      },

      /**
       * Returns the SGT with the highest version number which matches the
       * semantic version string passed in.
       *
       * @param {String} name - the SGT name as specified by the SG
       * @param {String} version - the semantic version string as specified by
       *  the SG
       * @returns {Object} the matching sample generator template with the
       *  highest version number
       */
      getSemverMatch(name, version) {
        return this.getSemverMatches(name, version)
        .then((templates) => {
          if (!templates.length) {
            return null;
          }

          let max = null;
          templates.forEach((t) => {
            if (max) {
              if (semver.gte(t.version, max.version)) {
                max = t;
              }
            } else {
              max = t;
            }
          });

          return max;
        });
      },

      /**
       * Returns the SGTs which match the semantic version string passed in.
       *
       * @param {String} name - the SGT name as specified by the SG
       * @param {String} version - the semantic version string as specified by
       *  the SG
       * @returns {Array} of templates (or empty array)
       */
      getSemverMatches(name, version) {
        return GeneratorTemplate.findAll({
          where: {
            name,
            isPublished: true,
          },
        })
        .then((templates) => {
          if (!templates || !Array.isArray(templates) || !templates.length) {
            return [];
          }

          return templates.filter((t) =>
            semver.satisfies(t.version, version));
        })
        .catch(() => []);
      },

      postImport(models) {
        assoc.user = GeneratorTemplate.belongsTo(models.User, {
          foreignKey: 'createdBy',
          as: 'user',
        });

        assoc.writers = GeneratorTemplate.belongsToMany(models.User, {
          as: 'writers',
          through: 'GeneratorTemplateWriters',
          foreignKey: 'generatorTemplateId',
        });

        GeneratorTemplate.addScope('defaultScope', {
          include: [
            {
              association: assoc.user,
              attributes: ['name', 'email'],
            },
          ],
          order: ['GeneratorTemplate.name'],
        }, {
          override: true,
        });
      },
    },

    hooks: {
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

      beforeUpdate(inst /*, opts */) {
        /*
         * Cannot unpublish this SGT if it has an SG with no other valid SGT
         * choices.
         */
        if (inst.changed('isPublished') && inst.isPublished === false) {
          // Find all the sample generators which use this SGT.
          const Gen = inst.$modelOptions.sequelize.models.Generator;
          const generatorsWithNoOtherMatches = [];
          return new seq.Promise((resolve, reject) => Gen.findAll({
            where: {
              'generatorTemplate.name': inst.name,
              isActive: true,
            },
          })
          /*
           * Check whether there are other valid SGT semver matches for each
           * one.
           */
          .each((sg) =>
            this.getSemverMatches(inst.name, sg.generatorTemplate.version)
            .then((matches) => {
              /*
               * If there is only one match, this it's *this* one, so we can't
               * unpublish it.
               */
              if (!matches || matches.length < 2) {
                generatorsWithNoOtherMatches.push(sg.name);
              }
            }))
          .then(() => {
            if (generatorsWithNoOtherMatches.length) {
              const names = generatorsWithNoOtherMatches.join(', ');
              const message = 'This Sample Generator Template is still ' +
                `being used by these Sample Generators: ${names}. At this ` +
                'time, there are are no other Sample Generator Templates ' +
                'installed and published which satisfy the Sample ' +
                'Generator version requirements, so you cannot unpublish ' +
                'this Sample Generator Template.';
              reject(new ValidationError({ message }));
            };

            resolve(true);
          }));
        }
      }, // hooks.beforeUpdate
    },
    validate: {
      eitherUrlORtoUrl() {
        if (this.connection.url && this.connection.toUrl ||
            (!this.connection.url && !this.connection.toUrl)) {
          throw new ValidationError('Only one of ["url", "toUrl"] is required');
        }
      },
    },
    indexes: [
      {
        name: 'GTUniqueLowercaseNameVersionIsDeleted',
        unique: true,
        fields: [
          seq.fn('lower', seq.col('name')),
          'version',
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
  return GeneratorTemplate;
};
