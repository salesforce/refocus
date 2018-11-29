'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.addColumn(
      'Collectors',
      'collectorGroupId',
      {
        type: Sequelize.UUID,
        references: {
          model: 'CollectorGroups',
          key: 'id',
        },
      }
    );
  },

  down: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn(
      'Collectors',
      'collectorGroupId'
    );
  }
};
