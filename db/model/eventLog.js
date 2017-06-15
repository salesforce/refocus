/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/eventLog.js
 *
 * Once an action is intiated from refocus bots need to be able to
 * check if they have any actions to perform. This table will act
 * as an action queue for bots.
 */

const assoc = {};
const dbErrors = require('../dbErrors');
const constants = require('../constants');

module.exports = function eventLog(seq, dataTypes) {
  const EventLog = seq.define('EventLog', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    log: {
      type: dataTypes.STRING,
      allowNull: false,
      validate: {
        is: constants.nameRegex,
      },
      comment: 'Name of the bot action',
    },
    context: {
      type: dataTypes.JSON,
      allowNull: true,
      comment:
        'After an action is completed the bot may have a response',
    },
  }, {
    classMethods: {
      getBotActionAssociations() {
        return assoc;
      },

      postImport(models) {
        assoc.room = BotAction.belongsTo(models.Room, {
          foreignKey: 'roomId',
        });
        assoc.room = BotAction.belongsTo(models.RoomType, {
          foreignKey: 'roomTypeId',
        });
        assoc.bot = BotAction.belongsTo(models.Bot, {
          foreignKey: 'botId',
        });
        assoc.bot = BotAction.belongsTo(models.BotData, {
          foreignKey: 'botDataId',
        });
        assoc.bot = BotAction.belongsTo(models.BotAction, {
          foreignKey: 'botActionId',
        });
        assoc.bot = BotAction.belongsTo(models.User, {
          foreignKey: 'userId',
        });
      },
    },
  });
  return EventLog;
};

