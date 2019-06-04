
/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/event.js
 *
 * This model is to store any log that might need to be searched
 * for later. The context JSON can be any format that log line
 * requires.
 */

const assoc = {};
const realTime = require('../../realtime/redisPublisher');
const constants = require('../constants');
const rtConstants = require('../../realtime/constants');
const botEventNames = rtConstants.events.botEvent;
const pubOpts = rtConstants.pubOpts.event;

module.exports = function event(seq, dataTypes) {
  const Event = seq.define('Event', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    log: {
      type: dataTypes.TEXT,
      allowNull: false,
      comment: 'This is a readable event logline',
    },
    actionType: {
      type: dataTypes.STRING(constants.fieldlen.normalName),
      allowNull: true,
      comment: 'This is the type of the event',
    },
    context: {
      type: dataTypes.JSON,
      allowNull: true,
      comment:
        'This is any JSON you want store to facilitate the event entry',
    },
  }, {
    hooks: {

      afterCreate: (instance) => {
        const changedKeys = Object.keys(instance._changed);
        const ignoreAttributes = ['isDeleted'];
        return realTime.publishObject(instance.toJSON(),
          botEventNames.add, changedKeys, ignoreAttributes, pubOpts);
      },

      afterUpdate(instance /* , opts */) {
        const changedKeys = Object.keys(instance._changed);
        const ignoreAttributes = ['isDeleted'];
        return realTime.publishObject(instance.toJSON(),
          botEventNames.upd, changedKeys, ignoreAttributes, pubOpts);
      }, // hooks.afterUpdate

      afterDestroy(instance /* , opts */) {
        const changedKeys = Object.keys(instance._changed);
        const ignoreAttributes = ['isDeleted'];
        return realTime.publishObject(instance.toJSON(),
          botEventNames.del, changedKeys, ignoreAttributes, pubOpts);
      }, // hooks.afterDestroy
    }, // hooks
    indexes: [
      {
        name: 'EventRoomBot',
        fields: ['roomId', 'botId'],
      },
    ],
  });

  /**
   * Class Methods:
   */

  /**
   * Creates multiple Events concurrently.
   * @param  {Array} toCreate - An array of Event objects to create
   * @param {Object} user - The user performing the write operation
   * @returns {Array} - Resolves to an array of resolved promises
   */
  Event.bulkCreate = function (toCreate, user) {
    const promises = toCreate.map((event) => Event.create(event, user)
      .catch((err) => Promise.resolve({ explanation: err, isFailed: true })));

    return seq.Promise.all(promises);
  }; // bulkCreate

  Event.getEventAssociations = function () {
    return assoc;
  };

  Event.getProfileAccessField = function () {
    return 'eventAccess';
  };

  Event.postImport = function (models) {
    assoc.room = Event.belongsTo(models.Room, {
      foreignKey: 'roomId',
    });
    assoc.bot = Event.belongsTo(models.Bot, {
      foreignKey: 'botId',
    });
    assoc.botData = Event.belongsTo(models.BotData, {
      foreignKey: 'botDataId',
    });
    assoc.botAction = Event.belongsTo(models.BotAction, {
      foreignKey: 'botActionId',
    });
    assoc.owner = Event.belongsTo(models.User, {
      foreignKey: 'ownerId',
      as: 'owner',
    });
    assoc.user = Event.belongsTo(models.User, {
      foreignKey: 'userId',
    });
    assoc.writers = Event.belongsToMany(models.User, {
      as: 'writers',
      through: 'EventWriters',
      foreignKey: 'botId',
    });

    Event.addScope('owner', {
      include: [
        {
          association: assoc.owner,
          attributes: ['name', 'email', 'fullName'],
        },
      ],
    });

    Event.addScope('user', {
      include: [
        {
          association: assoc.user,
          attributes: ['name', 'email', 'fullName'],
        },
      ],
    });

    Event.addScope('defaultScope', {
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

  return Event;
};

