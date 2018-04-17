/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

'use strict';
const TBL = 'Events';

module.exports = {
  up: function (qi, Sequelize) {
    return qi.changeColumn(TBL, 'log', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  down: function (qi, Sequelize) {
    return qi.changeColumn(TBL, 'log', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
