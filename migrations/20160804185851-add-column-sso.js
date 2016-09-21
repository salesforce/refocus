'use strict'; // eslint-disable-line strict

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'Users',
      'sso',
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }
    )
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn(
      'Users',
      'sso'
    )
  },
};
