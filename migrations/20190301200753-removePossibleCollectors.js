'use strict';

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.dropTable('GeneratorCollectors'),

  down: (queryInterface, Sequelize) =>
    queryInterface.createTable('GeneratorCollectors', {
      collectorId: {
        type: Sequelize.UUID,
        primaryKey: true,
      },
      generatorId: {
        type: Sequelize.UUID,
        primaryKey: true,
      },
    }),
};
