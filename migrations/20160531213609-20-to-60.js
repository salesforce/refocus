'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
    return queryInterface.changeColumn(
      'Subjects',
      'name',
      {
        type: Sequelize.STRING(60),
        allowNull: false,
        validate: {
          is: /^[0-9a-z_-]+$/i,
        },
      }
    )
    .then(() => {
      return queryInterface.changeColumn(
        'Aspects',
        'name',
        {
          type: Sequelize.STRING(60),
          allowNull: false,
          validate: {
            is: /^[0-9a-z_-]+$/i,
          },
        }
      )
    })
    .then(() => {
      return queryInterface.changeColumn(
        'Tags',
        'name',
        {
          type: Sequelize.STRING(60),
          allowNull: false,
          validate: {
            is: /^[0-9a-z_-]+$/i,
          },
        }
      )
    });
  },

  down: function (queryInterface, Sequelize) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
    return queryInterface.changeColumn(
      'Subjects',
      'name',
      {
        type: Sequelize.STRING(20),
        allowNull: false,
        validate: {
          is: /^[0-9a-z_-]+$/i,
        },
      }
    )
    .then(() => {
      return queryInterface.changeColumn(
        'Aspects',
        'name',
        {
          type: Sequelize.STRING(20),
          allowNull: false,
          validate: {
            is: /^[0-9a-z_-]+$/i,
          },
        }
      )
    })
    .then(() => {
      return queryInterface.changeColumn(
        'Tags',
        'name',
        {
          type: Sequelize.STRING(20),
          allowNull: false,
          validate: {
            is: /^[0-9a-z_-]+$/i,
          },
        }
      )
    });
  }
};
