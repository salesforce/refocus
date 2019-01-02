module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.addColumn(
      'Rooms',
      'createdBy',
      {
        type: Sequelize.UUID,
        references: {
          model: 'Users',
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
