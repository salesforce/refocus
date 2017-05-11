/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/room.js
 */
const common = require('../helpers/common');
const constants = require('../constants');

const assoc = {};

module.exports = function user(seq, dataTypes) {
  const Room = seq.define('Room', {
    name: {
      type: dataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Create a named room '
    },
    active: {
      type: dataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Determines if room is still active'
    }
  }, {
    classMethods: {
      getRoomAssociations() {
        return assoc;
      },
      postImport(models) {
        assoc.type = Room.belongsTo(models.RoomType, {
          foreignKey: 'type',
        });
        assoc.writers = Room.belongsToMany(models.User, {
          as: 'writers',
          through: 'RoomWriters',
          foreignKey: 'roomId',
        });
      },
    }
  });
  return Room;
};
