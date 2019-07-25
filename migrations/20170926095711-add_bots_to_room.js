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
      if (!attr.hasOwnProperty('bots')) {
        return qi.addColumn(TBL, 'bots', {
          type: Sequelize.ARRAY(Sequelize.STRING),
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
      if (attr.hasOwnProperty('bots')) {
        return qi.removeColumn(TBL, 'bots');
      }

      return true;
    });
  },
};
