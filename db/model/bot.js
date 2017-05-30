/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/bot.js
 *
 * Bots are distributed webapps that will interact with our
 * different routes. This object will be used to track
 * and organize the bots that are associated with refocus.
 */

const constants = require('../constants');

const assoc = {};

module.exports = function user(seq, dataTypes) {
  const Bot = seq.define('Bot', {
    name: {
      type: dataTypes.STRING,
      allowNull: false,
      unique: true,
      primaryKey: true,
      validate: {
        is: constants.nameRegex,
      },
      comment: 'Create a named bot',
    },
    location: {
      type: dataTypes.STRING,
      allowNull: false,
      validate: { isUrl: true },
      comment: 'The URL to load UI from',
    },
    active: {
      type: dataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Determines if bot is still active',
    },
  }, {
    classMethods: {
      getBotAssociations() {
        return assoc;
      },

      postImport(models) {
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
    },
  });
  return Bot;
};

