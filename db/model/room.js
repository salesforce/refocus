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

const assoc = {};

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
        });
      },
    },
  });
  return Room;
};

