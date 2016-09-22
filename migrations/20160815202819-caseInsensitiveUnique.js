'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.removeIndex('Aspects', ['name', 'isDeleted'])
      .then(() => {
        return queryInterface.addIndex(
          'Aspects',
          [Sequelize.fn('lower', Sequelize.col('name')), 'isDeleted'],
          {
            indexName: 'AspectUniqueLowercaseNameIsDeleted',
            indicesType: 'UNIQUE',
          }
        );
      })
      .then(() => {
        return queryInterface.removeIndex('Lenses', ['name', 'isDeleted']);
      })
      .then(() => {
        return queryInterface.addIndex(
          'Lenses',
          [Sequelize.fn('lower', Sequelize.col('name')), 'isDeleted'],
          {
            indexName: 'LensUniqueLowercaseNameIsDeleted',
            indicesType: 'UNIQUE',
          }
        );
      })
      .then(() => {
        return queryInterface.removeIndex('Perspectives', ['name', 'isDeleted']);
      })
      .then(() => {
        return queryInterface.addIndex(
          'Perspectives',
          [Sequelize.fn('lower', Sequelize.col('name')), 'isDeleted'],
          {
            indexName: 'PerspectiveUniqueLowercaseNameIsDeleted',
            indicesType: 'UNIQUE',
          }
        );
      })
      .then(() => {
        return queryInterface.removeIndex('Profiles', ['name', 'isDeleted']);
      })
      .then(() => {
        return queryInterface.addIndex(
          'Profiles',
          [Sequelize.fn('lower', Sequelize.col('name')), 'isDeleted'],
          {
            indexName: 'ProfileUniqueLowercaseNameIsDeleted',
            indicesType: 'UNIQUE',
          }
        );
      })
      .then(() => {
        return queryInterface.removeIndex('Subjects',
          ['absolutePath', 'isDeleted']);
      })
      .then(() => {
        return queryInterface.addIndex(
          'Subjects',
          [Sequelize.fn('lower', Sequelize.col('absolutePath')), 'isDeleted'],
          {
            indexName: 'SubjectUniqueLowercaseAbsolutePathIsDeleted',
            indicesType: 'UNIQUE',
          }
        );
      })
      .then(() => {
        return queryInterface.removeIndex('Tags',
          ['name', 'isDeleted', 'associationId']);
      })
      .then(() => {
        return queryInterface.addIndex(
          'Tags',
          [Sequelize.fn('lower', Sequelize.col('name')), 'isDeleted',
            'associationId'],
          {
            indexName: 'TagUniqueLowercaseNameIsDeletedAssociationId',
            indicesType: 'UNIQUE',
          }
        );
      })
      .then(() => {
        return queryInterface.removeIndex('Users', ['name', 'isDeleted']);
      })
      .then(() => {
        return queryInterface.addIndex(
          'Users',
          [Sequelize.fn('lower', Sequelize.col('name')), 'isDeleted'],
          {
            indexName: 'UserUniqueLowercaseNameIsDeleted',
            indicesType: 'UNIQUE',
          }
        );
      })
      .then(() => {
        return queryInterface.removeIndex('Users', ['email']);
      })
      .then(() => {
        return queryInterface.addIndex(
          'Users',
          [Sequelize.fn('lower', Sequelize.col('email'))],
          {
            indexName: 'UserLowercaseEmail',
          }
        );
      });
    });
  }, // up

  down: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.removeIndex('Aspects',
        'AspectUniqueLowercaseNameIsDeleted')
      .then(() => {
        return queryInterface.addIndex('Aspects', ['name', 'isDeleted']);
      })
      .then(() => {
        return queryInterface.removeIndex('Lenses',
          'LensUniqueLowercaseNameIsDeleted');
      })
      .then(() => {
        return queryInterface.addIndex('Lenses', ['name', 'isDeleted']);
      })
      .then(() => {
        return queryInterface.removeIndex('Perspectives',
          'PerspectiveUniqueLowercaseNameIsDeleted');
      })
      .then(() => {
        return queryInterface.addIndex('Perspectives', ['name', 'isDeleted']);
      })
      .then(() => {
        return queryInterface.removeIndex('Profiles',
          'ProfileUniqueLowercaseNameIsDeleted');
      })
      .then(() => {
        return queryInterface.addIndex('Profiles', ['name', 'isDeleted']);
      })
      .then(() => {
        return queryInterface.removeIndex('Subjects',
          'SubjectUniqueLowercaseAbsolutePathIsDeleted');
      })
      .then(() => {
        return queryInterface.addIndex('Subjects', ['absolutePath', 'isDeleted']);
      })
      .then(() => {
        return queryInterface.removeIndex('Tags',
          'TagUniqueLowercaseNameIsDeletedAssociationId');
      })
      .then(() => {
        return queryInterface.addIndex('Tags',
          ['name', 'isDeleted', 'associationId']);
      })
      .then(() => {
        return queryInterface.removeIndex('Users',
          'UserUniqueLowercaseNameIsDeleted');
      })
      .then(() => {
        return queryInterface.addIndex('Users', ['name', 'isDeleted']);
      })
      .then(() => {
        return queryInterface.removeIndex('Users', 'UserLowercaseEmail');
      })
      .then(() => {
        return queryInterface.addIndex('Users', ['email']);
      });
    });
  }, // down
};
