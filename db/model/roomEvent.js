/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/roomLog.js
 */
const common = require('../helpers/common');
const constants = require('../constants');

const assoc = {};

module.exports = function user(seq, dataTypes) {
  const RoomEvent = seq.define('RoomEvent', {
    log: {
      type: dataTypes.STRING,
      allowNull: false,
      comment: 'Readable log line',
    },
    type: {
      type: dataTypes.ENUM('ACTION', 'DATAUPDATE', 'DATACREATE', 'CONNECT', 'REFRESH'),
      defaultValue: 'CONNECT',
    },
    pendingAction: {
      type: dataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Determines if an pending action is completed',
    },
    name: {
      type: dataTypes.STRING,
      allowNull: true,
      comment: 'Name of action or data updated',
    },
  }, {
    classMethods: {
      getRoomEventAssociations() {
        return assoc;
      },

      postImport(models) {
        assoc.room = RoomEvent.belongsTo(models.Room, {
          foreignKey: 'roomId',
        });
        assoc.bot = RoomEvent.belongsTo(models.Bot, {
          foreignKey: 'botId',
        });
        assoc.user = RoomEvent.belongsTo(models.User, {
          foreignKey: 'userId',
        });
        assoc.botaction = RoomEvent.belongsTo(models.BotAction, {
          foreignKey: 'actionId',
        });
        assoc.currentbotdata = RoomEvent.belongsTo(models.CurrentBotData, {
          foreignKey: 'botDataId',
        });
        assoc.pendingaction = RoomEvent.belongsTo(models.PendingBotAction, {
          foreignKey: 'pendingId',
        });
      },
    }
  });  return RoomEvent;
};