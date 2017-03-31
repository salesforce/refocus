/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict';
const TBL = 'Samples';
module.exports = {
  up(qi, Sequelize) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return qi.createTable('users', { id: Sequelize.INTEGER });
    */
    return qi.sequelize.transaction(() => qi.removeColumn(TBL, 'isDeleted'))
    .then(() => qi.removeColumn(TBL, 'deletedAt'));
  },

  down(qi, Sequelize) {
    // /*
    //   Add reverting commands here.
    //   Return a promise to correctly handle asynchronicity.

    //   Example:
    //   return qi.dropTable('users');
    // */
    return qi.sequelize.transaction(() => qi.addColumn(TBL, 'isDeleted', {
      type: Sequelize.DATE,
      allowNull: true,
    }))
    .then(() => qi.addColumn(TBL, 'deletedAt', {
      type: Sequelize.DATE,
      allowNull: true,
    }));
  },
};
