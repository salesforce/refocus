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
const realTime = require('../../realtime/redisPublisher');
const rtConstants = require('../../realtime/constants');
const u = require('../helpers/botUtils');
const commonUtils = require('../../utils/common');
const botActionEventNames = {
  add: 'refocus.internal.realtime.bot.action.add',
  upd: 'refocus.internal.realtime.bot.action.update',
  del: 'refocus.internal.realtime.bot.action.remove',
};
const pubOpts = {
  client: rtConstants.bot.client,
  channel: rtConstants.bot.channel,
  filterIndex: rtConstants.bot.botActionFilterIndex,
  filterField: 'name',
};

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
          foreignKey: {
            name: 'roomId',
            allowNull: false,
          },
        });
        assoc.bot = BotAction.belongsTo(models.Bot, {
          foreignKey: {
            name: 'botId',
            allowNull: false,
          },
        });
        assoc.user = BotAction.belongsTo(models.User, {
          foreignKey: 'userId',
          allowNull: true,
        });
        assoc.writers = BotAction.belongsToMany(models.User, {
          as: 'writers',
          through: 'BotActionWriters',
          foreignKey: 'botId',
        });
      },
    },
    hooks: {

      /**
       * Check if the botId is a bot name then replace the
       * botId with the bots' ID.
       *
       * @param {Aspect} inst - The instance being validated
       * @returns {undefined} - OK
       */
      beforeValidate(inst /* , opts */) {
        const botId = inst.getDataValue('botId');
        if (commonUtils.looksLikeId(botId)) {
          return seq.Promise.resolve(inst);
        }

        return seq.models.Bot.findOne({
          where: {
            name: { $iLike: botId },
          },
        })
        .then((bot) => {
          inst.botId = bot.id;
        });
      },

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

            throw new dbErrors.ValidationError({
              message:
                'Action was not found',
            });
          })
          .then((dataFound) => {
            const params = inst.getDataValue('parameters');
            if (dataFound.parameters !== null) {
              if ((params !== undefined) && (params !== null)) {
                if (params.length !== dataFound.parameters.length) {
                  throw new dbErrors.ValidationError({
                    message:
                      'Wrong number of parameters sent to run this action',
                  });
                }
              } else {
                throw new dbErrors.ValidationError({
                  message:
                    'Action must contain parameters',
                });
              }
            }
          })
          .then(() => resolve(inst))
          .catch((err) => reject(err))
        );
      }, // hooks.beforeCreate

      afterCreate: (instance) => {
        const changedKeys = Object.keys(instance._changed);
        const ignoreAttributes = ['isDeleted'];
        return realTime.publishObject(instance.toJSON(),
          botActionEventNames.add, changedKeys, ignoreAttributes, pubOpts);
      },

      afterUpdate(instance /* , opts */) {
        return realTime.publishObject(instance.toJSON(),
          botActionEventNames.upd, null, null, pubOpts);
      }, // hooks.afterUpdate

      afterDelete(instance /* , opts */) {
        return realTime.publishObject(instance.toJSON(),
          botActionEventNames.del, null, null, pubOpts);
      }, // hooks.afterDelete
    }, // hooks
    indexes: [
      {
        name: 'BotActionsIdx',
        fields: [
          'name',
        ],
      },
    ],
  });
  return BotAction;
};

