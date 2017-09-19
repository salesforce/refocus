/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

'use strict';
const TBL = 'Rooms';

module.exports = {
  up: function (qi, Sequelize) {
    let attr;
    return qi.describeTable(TBL)
    .then((attributes) => {
      attr = attributes;
      if (!attr.hasOwnProperty('settings')) {
        return qi.addColumn(TBL, 'settings', {
          type: Sequelize.JSON,
          allowNull: true,
        });
      }

      return true;
    });
  },

  down: function (qi, Sequelize) {
    let attr;
    return qi.describeTable(TBL)
    .then((attributes) => {
      attr = attributes;
      if (attr.hasOwnProperty('settings')) {
        return qi.removeColumn(TBL, 'settings');
      }

      return true;
    });
  },
};
