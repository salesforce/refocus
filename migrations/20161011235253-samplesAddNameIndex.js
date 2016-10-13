'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    queryInterface.addIndex(
      'Samples',
      ['name'],
      {
        indexName: 'SampleName',
      }
    );
  },

  down: function (queryInterface, Sequelize) {
    queryInterface.removeIndex('Samples', 'SampleName');
  },
};
