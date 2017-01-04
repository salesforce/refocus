'use strict';

module.exports = {
  up(qi /* , Sequelize */) {
    qi.addIndex('Samples', ['name'], { indexName: 'SampleName' });
  },

  down(qi /* , Sequelize */) {
    qi.removeIndex('Samples', 'SampleName');
  },
};
