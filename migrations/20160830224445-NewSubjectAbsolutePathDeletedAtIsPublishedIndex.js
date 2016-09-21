'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.addIndex(
        'Subjects',
        [
          Sequelize.fn('lower', Sequelize.col('absolutePath')),
          'deletedAt',
          'isPublished',
        ],
        {
          indexName: 'SubjectAbsolutePathDeletedAtIsPublished',
        }
      );
    });
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.removeIndex('Subjects',
        'SubjectAbsolutePathDeletedAtIsPublished');
    });
  }
};
