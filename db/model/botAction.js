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
 * Once an action is initiated from refocus bots need to be able to
 * check if they have any actions to perform. This table will act
 * as an action queue for bots.
 */

const assoc = {};
const dbErrors = require('../dbErrors');
const constants = require('../constants');
const u = require('../helpers/botUtils');

module.exports = function botAction(seq, dataTypes) {
  const BotAction = seq.define('BotAction', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    isPending: {
      type: dataTypes.BOOLEAN,
      defaultValue: true,
      comment: 'Determines if bot action is still active',
    },
    name: {
      type: dataTypes.STRING,
      allowNull: false,
      validate: {
        is: constants.nameRegex,
      },
      comment: 'Name of the bot action',
    },
    parameters: {
      type: dataTypes.ARRAY(dataTypes.JSON),
      allowNull: true,
      validate: {
        contains: u.arrayHasValidParameters,
      },
      comment: 'List of parameters needed to run bot action',
    },
    response: {
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
          allowNull: false,
        });
        assoc.bot = BotAction.belongsTo(models.Bot, {
          foreignKey: 'botId',
          allowNull: false,
        });
        assoc.user = BotAction.belongsTo(models.User, {
          foreignKey: 'userId',
          allowNull: true,
        });
      },
    },
    hooks: {

      /**
       * Check if the paramaters required are being passed.
       * @param  {BotAction} inst The instance being created
       * @returns {Promise}
       */
      beforeCreate(inst /* , opts */) {
        return new seq.Promise((resolve, reject) =>
          seq.models.Bot.findOne({
            where: {
              id: inst.getDataValue('botId'),
            },
          })
          .then((botFound) => {
            for (let i = 0; i < botFound.actions.length; i++) {
              if (botFound.actions[i].name === inst.getDataValue('name')) {
                return botFound.actions[i];
              }
            }

            return null;
          })
          .then((dataFound) => {
            if (inst.getDataValue('parameters') != null) {
              if (inst.getDataValue('parameters').length !==
                dataFound.parameters.length) {
                throw new dbErrors.ValidationError({
                  message:
                    'Not enough parameters were sent to run this action',
                });
              }
            } else {
              throw new dbErrors.ValidationError({
                message: 'Action must contain parameters',
              });
            }
          })
          .then(() => resolve(inst))
          .catch((err) => reject(err))
        );
      }, // hooks.beforeCreate
    },
  });
  return BotAction;
};

