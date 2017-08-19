'use strict';

const TBL = 'Samples';

module.exports = {
  up(qi /* , Sequelize */) {
    qi.removeIndex(TBL, 'SampleName');
  },

  down(qi /* , Sequelize */) {
    qi.addIndex(TBL, ['name'], { indexName: 'SampleName' });
  },
};
