/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/botAction.js
 *
 * Bot webapps that interact with refocus need to be able to
 * declare what actions they can do. This table will hold
 * all the information needed to allow refocus to implement
 * the bot actions.
 */

const constants = require('../constants');

const assoc = {};

module.exports = function user(seq, dataTypes) {
  const BotAction = seq.define('BotAction', {
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
      comment: 'Name of bot action',
    },
    paramList: {
      type: dataTypes.ARRAY(dataTypes.STRING),
      allowNull: false,
      comment: 'Parameters needed to run an action',
    },
  }, {
    classMethods: {
      getBotActionAssociations() {
        return assoc;
      },

      postImport(models) {
        assoc.bot = BotAction.belongsTo(models.Bot, {
          foreignKey: 'botId',
        });
      },
    },
  });
  return BotAction;
};

