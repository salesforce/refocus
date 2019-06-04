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
 * so that it can be retrieved quickly in room rule checks. This table
 * will hold the current value for bot data for particular rooms.
 */

const assoc = {};
const u = require('../helpers/botDataUtils');
const dbErrors = require('../dbErrors');
const constants = require('../constants');
const commonUtils = require('../../utils/common');
const realTime = require('../../realtime/redisPublisher');
const rtConstants = require('../../realtime/constants');
const botDataEventNames = rtConstants.events.botData;
const pubOpts = rtConstants.pubOpts.botData;
const Op = require('sequelize').Op;

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
      type: dataTypes.TEXT,
      comment: 'Current value for bot data',
    },
  }, {

    hooks: {

      /**
       * If the botId is a bot name we search by that name and replace the
       * botId with the actual ID.
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
            name: { [Op.iLike]: botId },
          },
        })
        .then((bot) => {
          inst.botId = bot.id;
        });
      },

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
            },
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

      afterCreate: (instance) => {
        // Sync bot data
        const updateValues = new seq.Promise((resolve, reject) =>
          u.updateValues(seq, instance)
          .then(() => resolve(instance))
          .catch((err) => reject(err))
        );

        // Publish creation
        const changedKeys = Object.keys(instance._changed);
        const ignoreAttributes = ['isDeleted'];
        const publishObject = realTime.publishObject(instance.toJSON(),
          botDataEventNames.add, changedKeys, ignoreAttributes, pubOpts);

        return Promise.all([updateValues, publishObject]);
      },

      afterUpdate(instance /* , opts */) {
        // Sync bot data
        const updateValues = new seq.Promise((resolve, reject) =>
          u.updateValues(seq, instance)
          .then(() => resolve(instance))
          .catch((err) => reject(err))
        );

        // Publish update
        const changedKeys = Object.keys(instance._changed);
        const ignoreAttributes = ['isDeleted'];
        const publishObject = realTime.publishObject(instance.toJSON(),
          botDataEventNames.upd, changedKeys, ignoreAttributes, pubOpts);

        return Promise.all([updateValues, publishObject]);
      }, // hooks.afterUpdate

      afterDestroy(instance /* , opts */) {
        // Publish delete
        const changedKeys = Object.keys(instance._changed);
        const ignoreAttributes = ['isDeleted'];
        return realTime.publishObject(instance.toJSON(),
          botDataEventNames.del, changedKeys, ignoreAttributes, pubOpts);
      }, // hooks.afterDestroy
    },
    indexes: [
      {
        name: 'BotDataRoomBotandUniqueName',
        unique: true,
        fields: [seq.fn('lower', seq.col('name')), 'roomId', 'botId'],
      },
    ],
  });

  /**
   * Class Methods:
   */

  BotData.getBotDataAssociations = function () {
    return assoc;
  };

  BotData.postImport = function (models) {
    assoc.room = BotData.belongsTo(models.Room, {
      foreignKey: 'roomId',
      allowNull: false,
    });

    assoc.room = BotData.belongsTo(models.Bot, {
      foreignKey: 'botId',
      allowNull: false,
    });

    assoc.owner = BotData.belongsTo(models.User, {
      foreignKey: 'ownerId',
      as: 'owner',
    });

    assoc.user = BotData.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'user',
    });

    assoc.writers = BotData.belongsToMany(models.User, {
      as: 'writers',
      through: 'BotDataWriters',
      foreignKey: 'botId',
    });

    BotData.addScope('bdExists', (value) => ({
      where: {
        name: value.name,
        botId: value.botId,
        roomId: value.roomId,
      },
    }));

    BotData.addScope('defaultScope', {
      include: [
        {
          association: assoc.user,
          attributes: ['name', 'email', 'fullName'],
        },
        {
          association: assoc.owner,
          attributes: ['name', 'email', 'fullName'],
        },
      ],
    }, {
      override: true,
    });
  };

  BotData.bdExists = function (query) {
    return BotData.scope({ method: ['bdExists', query] }).findOne();
  };

  BotData.prototype.isWritableBy = function (who) {
    return new seq.Promise((resolve /* , reject */) =>
      this.getWriters()
      .then((writers) => {
        if (!writers.length) {
          resolve(true);
        }

        const found = writers.filter((w) =>
          w.name === who || w.id === who);
        resolve(found.length === 1);
      }));
  }; // isWritableBy

  return BotData;
};
