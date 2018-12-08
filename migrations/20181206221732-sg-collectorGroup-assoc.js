'use strict';

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.addColumn(
      'Generators',
      'collectorGroupId',
      {
        type: Sequelize.UUID,
        references: {
          model: 'CollectorGroups',
          key: 'id',
        },
      }
    ),

  down: (queryInterface, Sequelize) =>
    queryInterface.removeColumn(
      'Generators',
      'collectorGroupId'
    ),
};
