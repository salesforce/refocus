/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/roomRule.js
 */
const common = require('../helpers/common');
const constants = require('../constants');

const assoc = {};

module.exports = function user(seq, dataTypes) {
  const RoomRule = seq.define('RoomRule', {
    criteria: {
      type: dataTypes.JSON,
      allowNull: false,
      unique: true,
      comment: 'The criteria for a rule in a Lisps S-expressions JSON logic'
    }
  }, {
    classMethods: {
      getRoomRuleAssociations() {
        return assoc;
      },
      postImport(models) {
        assoc.room = RoomRule.belongsTo(models.RoomType, {
          foreignKey: 'roomTypeId',
        });
      },
    }
  });
  return RoomRule;
};
