/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/pendingBotAction.js
 */
const common = require('../helpers/common');
const constants = require('../constants');

const assoc = {};

module.exports = function user(seq, dataTypes) {
  const PendingBotAction = seq.define('PendingBotAction', {
    pending: {
      type: dataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Determines if bot is still active'
    },
    parameters: {
      type: dataTypes.STRING,
      allowNull: false,
      comment: 'Name of bot action'
    }
  }, {
    classMethods: {
      getPendingBotActionAssociations() {
        return assoc;
      },
      postImport(models) {
        assoc.room = PendingBotAction.belongsTo(models.Room, {
          foreignKey: 'roomId',
        });
        assoc.bot = PendingBotAction.belongsTo(models.Bot, {
          foreignKey: 'botId',
        });
        assoc.botData = PendingBotAction.belongsTo(models.BotAction, {
          foreignKey: 'botActionId',
        });
      },
    }
  });
  return PendingBotAction;
};
