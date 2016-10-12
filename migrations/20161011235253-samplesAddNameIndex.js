'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    queryInterface.addIndex(
      'Samples',
      [Sequelize.fn('lower', Sequelize.col('name')), 'isDeleted'],
      {
        indexName: 'SampleUniqueLowercaseNameIsDeleted',
        indicesType: 'UNIQUE',
      }
    );
  },

  down: function (queryInterface, Sequelize) {
    queryInterface.removeIndex('Samples', 'SampleUniqueLowercaseNameIsDeleted');
  },
};
