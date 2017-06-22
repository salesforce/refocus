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
      description: 'The http method ',
      enum: ['DELETE', 'GET', 'PATCH', 'POST', 'PUT'],
    },
    url: {
      description: 'Optional Url given by the author',
      type: 'string',
    },
    toUrl: {
      description: 'Optional toUrl given by the author',
      type: 'string',
    },
    headers: {
      description: 'Optional connection header information',
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
      },
    },

    indexes: [
      {
        name: 'GTNameVersion',
        unique: true,
        fields: [
          'name',
          'version',
        ],
      },
    ],
    paranoid: true,
  });
  return GeneratorTemplate;
};
