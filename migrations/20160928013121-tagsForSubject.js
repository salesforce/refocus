/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

'use strict';

const constants = require('../db/constants');

module.exports = {
  up: function (queryInterface, Sequelize) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.addColumn(
        'Subjects',
        'tags',
        {
          type: Sequelize.ARRAY(Sequelize.STRING(constants.fieldlen.normalName)),
          allowNull: true,
          defaultValue: constants.defaultArrayValue
        }
      );
    });
  },
  down: function (queryInterface, Sequelize) {
    // /*
    //   Add reverting commands here.
    //   Return a promise to correctly handle asynchronicity.

    //   Example:
    //   return queryInterface.dropTable('users');
    // */
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.removeColumn(
        'Subjects',
        'tags'
      );
    });
  },
};
