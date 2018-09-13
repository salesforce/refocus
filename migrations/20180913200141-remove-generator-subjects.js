'use strict';
require('../db/constants');

module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.removeColumn('Generators', 'subjects');
  },

  down: (queryInterface, Sequelize) => {
    const type = Sequelize.ARRAY(Sequelize.STRING(constants.fieldlen.normalName));
    return queryInterface.addColumn('Generators', 'subjects', { type });
  }
};
