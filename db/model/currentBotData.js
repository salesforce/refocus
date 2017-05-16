/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/currentBotData.js
 */
const common = require('../helpers/common');
const constants = require('../constants');

const assoc = {};

module.exports = function user(seq, dataTypes) {
  const CurrentBotData = seq.define('CurrentBotData', {
    value: {
      type: dataTypes.STRING,
      comment: 'Current Value for bot data',
    }
  }, {
    classMethods: {
      getCurrentBotDataAssociations() {
        return assoc;
      },

      postImport(models) {
        assoc.room = CurrentBotData.belongsTo(models.Room, {
          foreignKey: 'roomId',
        });
        assoc.botData = CurrentBotData.belongsTo(models.BotData, {
          foreignKey: 'botDataId',
        });
      },
    }
  });
  return CurrentBotData;
};
