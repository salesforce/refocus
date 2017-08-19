/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
const TBL = 'Tokens';

module.exports = {
  up(qi /* , Sequelize */) {
    return qi.sequelize.transaction(() => qi.removeColumn(TBL, 'token')
      .then(() => qi.renameColumn(TBL, 'isDisabled', 'isRevoked')));
  },

  down(qi, Sequelize) {
    return qi.sequelize.transaction(() => qi.addColumn(TBL, 'token', {
      type: Sequelize.STRING,
      allowNull: false,
      unique: true,
    })
    .then(() => qi.renameColumn(TBL, 'isRevoked', 'isDisabled')));
  },
};
