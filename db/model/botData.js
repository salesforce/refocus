/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/botData.js
 *
 * During a room session bots data will need to be localized
 * so that it can be retrieved quickly in room rule checks.
 * This table will hold the current value for bot data.
 */

const assoc = {};
const dbErrors = require('../dbErrors');
const constants = require('../constants');

module.exports = function botData(seq, dataTypes) {
  const BotData = seq.define('BotData', {
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
      comment: 'Name of the bot data',
    },
    value: {
      type: dataTypes.STRING,
      comment: 'Current value for bot data',
    },
  }, {
    classMethods: {
      getBotDataAssociations() {
        return assoc;
      },

      postImport(models) {
        assoc.room = BotData.belongsTo(models.Room, {
          foreignKey: 'roomId',
          allowNull: false,
        });
        assoc.room = BotData.belongsTo(models.Bot, {
          foreignKey: 'botId',
          allowNull: false,
        });
      },
    },
    hooks: {

      /**
       * Restrict creating new data if one already exists.
       * @param  {BotData} inst The instance being created
       * @returns {Promise}
       */
      beforeCreate(inst /* , opts */) {
        return new seq.Promise((resolve, reject) =>
          BotData.findOne({
            where: {
              roomId: inst.getDataValue('roomId'),
              botId: inst.getDataValue('botId'),
              name: inst.getDataValue('name'),
            }
          })
          .then((dataFound) => {
            if (dataFound) {
              throw new dbErrors.ValidationError({
                message: 'Bot data with the name ' + inst.getDataValue('name') +
                'already is in use in this room at ID ' + dataFound.id,
              });
            }
          })
          .then(() => resolve(inst))
          .catch((err) => reject(err))
        );
      }, // hooks.beforeCreate
    },
  });
  return BotData;
};

