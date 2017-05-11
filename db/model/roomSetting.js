/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/RoomSetting.js
 */
const common = require('../helpers/common');
const constants = require('../constants');

const assoc = {};

module.exports = function user(seq, dataTypes) {
  const RoomSetting = seq.define('RoomSetting', {
    key: {
      type: dataTypes.STRING,
      allowNull: false,
      unique: true,
      comment: 'Reference Key for all room type settings'
    },
    value: {
      type: dataTypes.STRING,
      allowNull: false,
      unique: false,
      comment: 'Value for all room type settings'
    }
  }, {
    classMethods: {
      getRoomSettingAssociations() {
        return assoc;
      },
      postImport(models) {
        assoc.room = RoomSetting.belongsTo(models.RoomType, {
          foreignKey: 'roomTypeId',
        });
      },
    }
  });
  return RoomSetting;
};
