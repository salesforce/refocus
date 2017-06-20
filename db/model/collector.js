/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/collector.js
 */

const constants = require('../constants');
const CollectorDeleteConstraintError = require('../dbErrors')
  .CollectorDeleteConstraintError;

const assoc = {};

module.exports = function collector(seq, dataTypes) {
  const Collector = seq.define('Collector', {
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
    registered: {
      type: dataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    status: {
      type: dataTypes.ENUM(Object.keys(constants.collectorStatuses)),
      defaultValue: constants.collectorStatuses.Stopped,
      allowNull: false,
    },
  }, {
    classMethods: {
      getCollectorAssociations() {
        return assoc;
      },

      postImport(models) {
        assoc.createdBy = Collector.belongsTo(models.User, {
          foreignKey: 'createdBy',
        });
      },
    },
    defaultScope: {
      order: ['Collector.name'],
    },
    hooks: {
      beforeDestroy() {
        throw new CollectorDeleteConstraintError();
      }, // hooks.beforeDestroy

      beforeBulkDestroy() {
        throw new CollectorDeleteConstraintError();
      }, // hooks.beforeBulkDestroy
    }, // hooks
    indexes: [
      {
        name: 'CollectorUniqueLowercaseName',
        unique: true,
        fields: [
          seq.fn('lower', seq.col('name')),
        ],
      },
    ],
  });
  return Collector;
}; // exports
