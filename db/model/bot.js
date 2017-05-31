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
const u = require('../helpers/botUtils');
const assoc = {};

module.exports = function bot(seq, dataTypes) {
  const Bot = seq.define('Bot', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    name: {
      type: dataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        is: constants.nameRegex,
      },
      comment: 'Create a named bot',
    },
    url: {
      type: dataTypes.STRING,
      allowNull: false,
      validate: { isUrl: true },
      comment: 'The URL to load bot',
    },
    active: {
      type: dataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Determines if bot is still active',
    },
    actions: {
      type: dataTypes.ARRAY(dataTypes.JSONB),
      allowNull: true,
      validate: {
        contains: u.validateActionArray,
      },
      comment: 'List of actions a Bot can take',
    },
    data: {
      type: dataTypes.ARRAY(dataTypes.JSONB),
      allowNull: true,
      validate: {
        contains: u.validateDataArray,
      },
      comment: 'List of data variables a bot has available',
    },
  }, {
    classMethods: {
      getBotAssociations() {
        return assoc;
      },

      postImport(models) {
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

