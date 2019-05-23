/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/globalconfig.js
 */
const common = require('../helpers/common');
const constants = require('../constants');

const assoc = {};

module.exports = function user(seq, dataTypes) {
  const GlobalConfig = seq.define('GlobalConfig', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    key: {
      type: dataTypes.STRING(256),
      allowNull: false,
      validate: {
        is: constants.nameRegex,
      },
    },
    value: {
      type: dataTypes.STRING,
      allowNull: true,
    },
  }, {
    indexes: [
      {
        name: 'GlobalConfigUniqueLowercaseKey',
        unique: false,
        fields: [seq.fn('lower', seq.col('key'))],
      },
    ],
  });

  /**
   * Class Methods:
   */

  GlobalConfig.getGlobalConfigAssociations = function () {
    return assoc;
  };

  GlobalConfig.postImport = function (models) {
    assoc.createdBy = GlobalConfig.belongsTo(models.User, {
      foreignKey: 'createdBy',
    });
  };

  return GlobalConfig;
};
