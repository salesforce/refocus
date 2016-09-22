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
    return queryInterface.removeColumn(
      'Perspectives',
      'query'
    )
    .then(() => queryInterface.addColumn(
      'Perspectives',
      'rootSubject',
      {
        type: Sequelize.STRING(constants.fieldlen.longish),
        allowNull: false,
      }
    ))
    .then(() => queryInterface.addColumn(
      'Perspectives',
      'aspectFilter',
      {
        type: Sequelize.ARRAY(Sequelize.STRING(constants.fieldlen.normalName)),
      }
    ))
    .then(() => queryInterface.addColumn(
      'Perspectives',
      'aspectTagFilter',
      {
        type: Sequelize.ARRAY(Sequelize.STRING(constants.fieldlen.normalName)),
      }
    ))
    .then(() => queryInterface.addColumn(
      'Perspectives',
      'subjectTagFilter',
      {
        type: Sequelize.ARRAY(Sequelize.STRING(constants.fieldlen.normalName)),
      }
    ))
    .then(() => queryInterface.addColumn(
      'Perspectives',
      'statusFilter',
      {
        type: Sequelize.ARRAY(Sequelize.STRING),
      }
    ));
  },

  down: function (queryInterface, Sequelize) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
    return queryInterface.removeColumn(
      'Perspectives',
      'statusFilter'
    )
    .then(() => queryInterface.removeColumn(
      'Perspectives',
      'subjectTagFilter'
    ))
    .then(() => queryInterface.removeColumn(
      'Perspectives',
      'aspectTagFilter'
    ))
    .then(() => queryInterface.removeColumn(
      'Perspectives',
      'aspectFilter'
    ))
    .then(() => queryInterface.removeColumn(
      'Perspectives',
      'rootSubject'
    ))
    .then(() => queryInterface.addColumn(
      'Perspectives',
      'query',
      {
        type: Sequelize.STRING(20480),
      }
    ));
  },
};
