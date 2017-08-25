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

const assoc = {};

const authorSchema = {
  properties: {
    url: {
      description: 'Optional Url given by the author',
      type: 'string',
      format: 'url',
    },
    name: {
      description: 'Name of the author',
      type: 'string',
      maxLength: constants.fieldlen.normalName,
      required: true,
    },
    email: {
      description: 'Author\'s email address',
      type: 'string',
      format: 'email',
      require: true,
    },
  },
};

const repositorySchema = {
  properties: {
    url: {
      description: 'Url repository',
      type: 'string',
    },
    type: {
      description: 'Type of the version control system',
      type: 'string',
      maxLength: constants.fieldlen.normalName,
    },
  },
};

const connectionSchema = {
  properties: {
    method: {
      description: 'The http method',
      enum: ['DELETE', 'GET', 'PATCH', 'POST', 'PUT'],
      required: true,
    },
    url: {
      description: 'The url to connect to. Specify variables for variable ' +
      'expansion using double curly braces. One of ' +
      '["url", "toUrl"] is required.',
      type: 'string',
    },

    toUrl: {
      description: 'The string body of a function which returns the url ' +
      'to connect to. One of ["url", "toUrl"] is required.',
    },
    proxy: {
      description: ' The Proxy server for the http request, if needed',
      type: 'string',
    },
    headers: {
      description: 'Optional connection headers',
      type: 'object',
    },
    bulk: {
      description: 'Set to false if you want to send one request for each of ' +
      'the designated subjects. Set to true if you want to collect data for ' +
      'all of the designated subjects in a single request. When set to true, ' +
      'the url string or url function may only reference context attributes ' +
      'with defaults.',
      type: 'boolean',
      defaultValue: false,
    },
  },
};

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

      getSemverMatch(name, version) {
        return GeneratorTemplate.findAll({
          where: {
            name,
          },
        }).then((templates) => {
          if (!templates || !templates.length) {
            return null;
          }

          let matchedTemplate = null;
          templates.forEach((template) => {
            if (matchedTemplate) {
             /*
              * ok is true when the current template version satisfies the
              * given version and the current template version is greater
              * than or equal(>=) to the version of the matched template
              * that is returned finally.
              */
              const ok = semver.satisfies(template.version, version) &&
               semver.gte(template.version, matchedTemplate.version);
              matchedTemplate = ok ? template : matchedTemplate;
            } else if (semver.satisfies(template.version, version)) {
              matchedTemplate = template;
            }
          });

          return matchedTemplate;
        });
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
