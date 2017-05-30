/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/botData.js
 *
 * Bot webapps will have data that refocus will want to retrieve
 * or store. This table will define the data information to be
 * used manipulate the bots data.
 */

const constants = require('../constants');

const assoc = {};

module.exports = function user(seq, dataTypes) {
  const BotData = seq.define('BotData', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    name: {
      type: dataTypes.STRING,
      allowNull: false,
      validate: {
        is: constants.nameRegex,
      },
      comment: 'Name of bot data',
    },
    type: {
      type: dataTypes.ENUM('BOOLEAN', 'INTERGER', 'DECIMAL', 'ARRAY', 'STRING'),
      defaultValue: 'BOOLEAN',
      comment: 'Type of bot data',
    },
  }, {
    classMethods: {
      getBotDataAssociations() {
        return assoc;
      },

      postImport(models) {
        assoc.bot = BotData.belongsTo(models.Bot, {
          foreignKey: 'botId',
        });
      },
    },
  });
  return BotData;
};

