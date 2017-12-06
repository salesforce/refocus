/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/room.js
 *
 * Rooms are gathering point for incident response. This table
 * will hold the basic details for each of these rooms.
 */

const constants = require('../constants');
const realTime = require('../../realtime/redisPublisher');
const rtConstants = require('../../realtime/constants');
const assoc = {};
const roomEventNames = {
  add: 'refocus.internal.realtime.bot.namespace.initialize',
  upd: 'refocus.internal.realtime.room.settingsChanged',
  del: 'refocus.internal.realtime.room.remove',
};
const pubOpts = {
  client: rtConstants.bot.client,
  channel: rtConstants.bot.channel,
  filterIndex: rtConstants.bot.roomFilterIndex,
  filterField: 'name',
};

module.exports = function room(seq, dataTypes) {
  const Room = seq.define('Room', {
    id: {
      type: dataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: dataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        is: constants.nameRegex,
      },
      comment: 'Create a named room ',
    },
    settings: {
      type: dataTypes.JSON,
      allowNull: true,
      comment: 'Key/Value pairs for user specific settings',
    },
    active: {
      type: dataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Determines if room is still active',
    },
    bots: {
      type: dataTypes.ARRAY(dataTypes.STRING),
      allowNull: true,
      comment: 'Bot names to be used in rooms',
    },
  }, {
    classMethods: {
      getRoomAssociations() {
        return assoc;
      },

      getProfileAccessField() {
        return 'roomAccess';
      },

      postImport(models) {
        assoc.type = Room.belongsTo(models.RoomType, {
          foreignKey: {
            name: 'type',
            allowNull: false,
          },
          onDelete: 'CASCADE',
        });
        assoc.writers = Room.belongsToMany(models.User, {
          as: 'writers',
          through: 'RoomWriters',
          foreignKey: 'roomId',
        });
      },
    },
    hooks: {

      /**
       * Ensures room gets default values from roomType
       *
       * @param {Instance} instance - The instance being created
       * @returns {Promise} which resolves to the instance
       */
      beforeCreate: (instance) => {
        const RoomType = seq.models.RoomType;
        return RoomType.findById(instance.type)
        .then((roomType) => {
          instance.settings = roomType.settings;
          instance.bots = roomType.bots;
        });
      },

      /**
       * Publishes room updates to redis.
       *
       * @param {Instance} instance - The instance being created
       * @returns {Promise} which resolves to the instance
       */
      afterCreate: (instance) => {
        const changedKeys = Object.keys(instance._changed);
        const ignoreAttributes = ['isDeleted'];
        return realTime.publishObject(instance.toJSON(), roomEventNames.add,
          changedKeys, ignoreAttributes, pubOpts);
      },

      afterUpdate(instance /* , opts */) {
        if (instance.changed('settings')) {
          if (instance.active) {
            return realTime.publishObject(instance.toJSON(), roomEventNames.upd,
              null, null, pubOpts);
          }
        }

        return seq.Promise.resolve();
      }, // hooks.afterUpdate

      afterDelete(instance /* , opts */) {
        if (instance.getDataValue('active')) {
          return realTime.publishObject(instance.toJSON(), roomEventNames.upd,
              null, null, pubOpts);
        }

        return seq.Promise.resolve();
      }, // hooks.afterDelete
    },
  });
  return Room;
};

