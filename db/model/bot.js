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
 *
 * Actions are objects that have a name and parameters analogous
 * function methods. The name is how the actions will be refered to
 * and the parameters is an array of objects that contain name and types.
 * Each parameter describe the expected parameters needed to run an action.
 *
 * Data are analogous to state variables; they describe what kind of data
 * can be retreived from bots. Each data value in the array have a name
 * and type that so the data can be easily parsed for later use.
 *
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
    ui: {
      type: dataTypes.BLOB,
      allowNull: true,
      comment: 'The packaged UI of the bot',
    },
    active: {
      type: dataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Determines if bot is still active',
    },
    actions: {
      type: dataTypes.ARRAY(dataTypes.JSON),
      allowNull: true,
      validate: {
        contains: u.validateActionArray,
      },
      comment: 'List of actions a Bot can take',
    },
    settings: {
      type: dataTypes.ARRAY(dataTypes.JSONB),
      allowNull: true,
      validate: {
        contains: u.validateSettingsArray,
      },
      comment: 'Array[ {key: name of key, helpText: describe the value it is looking for},]',
    },
    data: {
      type: dataTypes.ARRAY(dataTypes.JSON),
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

      getProfileAccessField() {
        return 'botAccess';
      },

      postImport(models) {
        assoc.writers = Bot.belongsToMany(models.User, {
          as: 'writers',
          through: 'BotWriters',
          foreignKey: 'botId',
        });
        assoc.roomTypes = Bot.belongsToMany(models.RoomType, {
          foreignKey: 'botId',
          through: 'RoomTypeBots',
        });

        Bot.addScope('botUI', {
          attributes: { include: ['ui'] },
        });

        Bot.addScope('defaultScope', {
          attributes: { exclude: ['ui'] },
        }, {
          override: true,
        });
      },
    },
  });
  return Bot;
};

