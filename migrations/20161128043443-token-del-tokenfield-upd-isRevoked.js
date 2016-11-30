/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

module.exports = {

  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.removeColumn(
        'Tokens',
        'token'
      ).then(() => queryInterface.renameColumn(
        'Tokens',
        'isDisabled',
        'isRevoked'
      ));
    });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.addColumn(
        'Tokens',
        'token',
        {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
        }
      )
      .then(() => queryInterface.renameColumn(
        'Tokens',
        'isRevoked',
        'isDisabled'
      ));
    });
  },
};
