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
const u = require('../helpers/roomTypeUtils');
const featureToggles = require('feature-toggles');
const common = require('../helpers/common');

const assoc = {};
const roomEventNames = {
  add: 'refocus.internal.realtime.room.add',
  upd: 'refocus.internal.realtime.room.update',
  del: 'refocus.internal.realtime.room.remove',
};
const sampleStoreFeature =
                  require('../../cache/sampleStore').constants.featureName;
const redisOps = require('../../cache/redisOps');
const redisRoomType = redisOps.roomType;

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
      afterCreate: (instance) => {
        const RoomType = seq.models.RoomType;
        return RoomType.findById(instance.type)
        .then((roomType) => {
          instance.settings = roomType.settings;
          if (instance.getDataValue('active')) {
            if (featureToggles.isFeatureEnabled(sampleStoreFeature)) {
              // create an entry in Store
              redisOps.addKey(redisRoomType, instance.getDataValue('name'));
              redisOps.hmSet(redisRoomType, instance.name, instance);
            }
          }
        });
      },

      afterUpdate(instance /* , opts */) {
        if (featureToggles.isFeatureEnabled(sampleStoreFeature)) {
          if (instance.changed('name') && instance.active) {
            const newRoomName = instance.name;
            const oldRoomName = instance._previousDataValues.name;

            redisOps.renameKey(redisRoomType, oldRoomName, newRoomName);
          } else if (instance.changed('active')) {
            if (instance.active) {
              redisOps.addKey(redisRoomType, instance.name);
              redisOps.hmSet(redisRoomType, instance.name, instance.get());
            } else {
              redisOps.deleteKey(redisRoomType, instance.name);
              common.publishChange(instance, roomEventNames.del);
            }
          } else if (instance.active) {
            const instanceChanged = {};
            Object.keys(instance._changed).forEach((key) => {
              instanceChanged[key] = instance[key];
            });
            redisOps.hmSet(redisRoomType, instance.name, instanceChanged);
          }
        }

        if (instance.changed('settings')) {
          if (instance.active) {
            common.publishChange(instance, roomEventNames.upd);
          }
        }
        return seq.Promise.resolve();
      }, // hooks.afterUpdate

      afterDelete(instance /* , opts */) {
        if (instance.getDataValue('active')) {
          if (featureToggles.isFeatureEnabled(sampleStoreFeature)) {
            redisOps.deleteKey(redisRoomType, instance.name);
            common.publishChange(instance, roomEventNames.del);
          }
        }
      }, // hooks.afterDelete
    },
  });
  return Room;
};

