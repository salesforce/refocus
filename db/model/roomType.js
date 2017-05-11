/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/roomType.js
 */
const common = require('../helpers/common');
const constants = require('../constants');

const assoc = {};

module.exports = function user(seq, dataTypes) {
  const RoomType = seq.define('RoomType', {
    name: {
      type: dataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Create a named room type'
    },
    active: {
      type: dataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Determines if room type is still active'
    }
  }, {
    classMethods: {
      getRoomTypeAssociations() {
        return assoc;
      },
      postImport(models) {
        assoc.settings = RoomType.hasMany(models.RoomSetting, {
          as: 'settings',
          foreignKey: 'roomTypeId',
        });
        assoc.rules = RoomType.hasMany(models.RoomRule, {
          as: 'rules',
          foreignKey: 'roomTypeId',
        });
        assoc.connectedBot = RoomType.belongsToMany(models.Bot, {
          as: 'bots',
          through: 'RoomBots',
          foreignKey: 'roomTypeId',
        });
        assoc.writers = RoomType.belongsToMany(models.User, {
          as: 'writers',
          through: 'RoomTypeWriters',
          foreignKey: 'roomTypeId',
        });
      },
    }
  });
  return RoomType;
};
