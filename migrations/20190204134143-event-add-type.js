'use strict';

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.addColumn(
      'Events',
      'actionType',
      {
        type: Sequelize.STRING(60),
        allowNull: true,
      }
    ),

  down: (queryInterface, Sequelize) =>
    queryInterface.removeColumn(
      'Events',
      'actionType'
    ),
};
