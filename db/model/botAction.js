/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/botAction.js
 */
const common = require('../helpers/common');
const constants = require('../constants');

const assoc = {};

module.exports = function user(seq, dataTypes) {
  const BotAction = seq.define('BotAction', {
    name: {
      type: dataTypes.STRING,
      allowNull: false,
      comment: 'Name of bot action'
    },
    paramList: {
      type: dataTypes.STRING,
      allowNull: false,
      comment: 'Paramaters needed'
    },
    numOfParam: {
      type: dataTypes.INTEGER,
      allowNull: false,
      comment: 'Value for all room type settings'
    }
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
    }
  });
  return BotAction;
};
