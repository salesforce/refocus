'use strict';
const TBL = 'Rooms';
module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.addColumn(
      TBL,
      'origin', {
        type: Sequelize.ENUM('auto_create', 'GUS', 'other', 'slack', 'web'),
        default: 'other',
        allowNull: false,
      }
    ),

  down: (queryInterface, Sequelize) =>
    queryInterface.removeColumn(TBL, 'origin'
    ),
};
