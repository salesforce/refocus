/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/bot.js
 */
const common = require('../helpers/common');
const constants = require('../constants');

const assoc = {};

module.exports = function user(seq, dataTypes) {
  const Bot = seq.define('Bot', {
    name: {
      type: dataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Create a named bot '
    },
    location: {
      type: dataTypes.STRING,
      allowNull: false,
      comment: 'The URL to load UI from'
    },
    active: {
      type: dataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Determines if bot is still active'
    }
  }, {
      classMethods: {
        getBotAssociations() {
          return assoc;
        },
        postImport(models) {
          assoc.connectedBot = Bot.belongsToMany(models.Room, {
            as: 'rooms',
            through: 'RoomBots',
            foreignKey: 'botId',
          });
          assoc.action = Bot.hasMany(models.BotAction, {
            as: 'actions',
            foreignKey: 'botId',
          });
          assoc.data = Bot.hasMany(models.BotData, {
            as: 'datas',
            foreignKey: 'botId',
          });
          assoc.writers = Bot.belongsToMany(models.User, {
            as: 'writers',
            through: 'BotWriters',
            foreignKey: 'botId',
          });
        },
      }
  });
  return Bot;
};
