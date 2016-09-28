'use strict';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.createTable('GlobalConfig', {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
        },
        isDeleted: {
          type: Sequelize.BIGINT,
          defaultValue: 0,
          allowNull: false,
        },
        key: {
          type: Sequelize.STRING(256),
          allowNull: false,
          validate: {
            is: /^[0-9a-z_-]+$/i,
          },
        },
        value: {
          type: Sequelize.STRING,
          allowNull: true,
        },
      });
    });
  }, // up

  down: function (queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return queryInterface.dropTable('GlobalConfig');
    });
  }, // down
};
