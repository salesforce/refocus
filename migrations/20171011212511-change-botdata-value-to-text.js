/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

'use strict';
const TBL = 'BotData';

module.exports = {
  up: function (qi, Sequelize) {
    return qi.changeColumn(TBL, 'value', {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },

  down: function (qi, Sequelize) {
    return qi.changeColumn(TBL, 'value', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
};
