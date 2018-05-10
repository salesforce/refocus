/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict';
const TBL = 'Generators';
const COL = 'intervalSecs';

module.exports = {
  up(qi, Seq) {
    return qi.addColumn(TBL, COL, {
      type: Seq.INTEGER,
      defaultValue: 60,
      validate: {
        isInt: true,
        min: 1,
      },
    });
  },

  down(qi, Sequelize) {
    return qi.removeColumn(TBL, COL);
  },
};
