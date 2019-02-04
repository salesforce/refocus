'use strict';

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.addColumn(
      'Events',
      'type',
      {
        type: Sequelize.STRING(60),
        allowNull: true,
      }
    ),

  down: (queryInterface, Sequelize) =>
    queryInterface.removeColumn(
      'Events',
      'type'
    ),
};
