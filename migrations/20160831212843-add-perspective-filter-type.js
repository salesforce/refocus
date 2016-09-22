'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.addColumn(
        'Perspectives',
        'aspectFilterType',
        {
          type: Sequelize.ENUM('INCLUDE', 'EXCLUDE'),
          defaultValue: 'INCLUDE',
          allowNull: false,
        }
      )
      .then(() => {
        return queryInterface.addColumn(
          'Perspectives',
          'aspectTagFilterType',
          {
            type: Sequelize.ENUM('INCLUDE', 'EXCLUDE'),
            defaultValue: 'INCLUDE',
            allowNull: false,
          }
        );
      })
      .then(() => {
        return queryInterface.addColumn(
          'Perspectives',
          'subjectTagFilterType',
          {
            type: Sequelize.ENUM('INCLUDE', 'EXCLUDE'),
            defaultValue: 'INCLUDE',
            allowNull: false,
          }
        );
      })
      .then(() => {
        return queryInterface.addColumn(
          'Perspectives',
          'statusFilterType',
          {
            type: Sequelize.ENUM('INCLUDE', 'EXCLUDE'),
            defaultValue: 'INCLUDE',
            allowNull: false,
          }
        );
      });
    }); // up
  },

  down: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.removeColumn(
        'Perspectives',
        'aspectFilterType'
      )
      .then(() => {
        return queryInterface.removeColumn(
        'Perspectives',
        'aspectTagFilterType'
        );
      })
      .then(() => {
        return queryInterface.removeColumn(
        'Perspectives',
        'subjectTagFilterType'
        );
      })
      .then(() => {
        return queryInterface.removeColumn(
        'Perspectives',
        'statusFilterType'
        );
      })
    }); // down
  },
};
