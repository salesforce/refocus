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

    // TODO: revisit toUrl validation, while doing the api changes
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
    bulk: {
      type: dataTypes.BOOLEAN,
      defaultValue: false,
    },
    keywords: {
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

      postImport(models) {
        assoc.createdBy = GeneratorTemplate.belongsTo(models.User, {
          foreignKey: 'createdBy',
        });

        assoc.writers = GeneratorTemplate.belongsToMany(models.User, {
          as: 'writers',
          through: 'GeneratorTemplateWriters',
          foreignKey: 'generatorTemplateId',
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
        name: 'GTNameVersion',
        unique: true,
        fields: [
          'name',
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
