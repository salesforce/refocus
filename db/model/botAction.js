/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/pendingBotAction.js
 *
 * Once an action is intiated from refocus bots need to be able to
 * check if they have any actions to perform. This table will act
 * as an action queue for bots.
 */

const assoc = {};

module.exports = function user(seq, dataTypes) {
  const PendingBotAction = seq.define('PendingBotAction', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    pending: {
      type: dataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Determines if bot action is still active',
    },
    parameters: {
      type: dataTypes.ARRAY(dataTypes.JSON),
      allowNull: true,
      comment: 'List of parameters needed to run bot action',
    },
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
      },
    },
  });
  return PendingBotAction;
};

