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
    return queryInterface.sequelize.transaction(() => queryInterface.addColumn('Subjects', 'sortBy', {
      type: Sequelize.STRING(constants.fieldlen.sortField),
      allowNull: true,
      validate: {
        is: /^[0-9a-z_-]+$/i,
      }
    }));
  },

  down: function (queryInterface, Sequelize) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
    return queryInterface.sequelize.transaction(() => queryInterface.removeColumn('Subjects', 'sortBy'));
  }
};
