'use strict';
const constants = require('../db/constants');

module.exports = {
  up(qi, Sequelize) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

    */
    return qi.sequelize.transaction(() =>
    qi.changeColumn('Subjects', 'sortBy', {
      type: Sequelize.STRING(constants.fieldlen.sortField),
      allowNull: true,
      defaultValue: '',
      validate: {
        is: /^[0-9a-z_-]*$/i,
      },
    }));
  },

  down(qi, Sequelize) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.
    */
    return qi.sequelize.transaction(() =>
    qi.changeColumn('Subjects', 'sortBy', {
      type: Sequelize.STRING(constants.fieldlen.sortField),
      allowNull: true,
      defaultValue: undefined,
      validate: {
        is: /^[0-9a-z_-]+$/i,
      },
    }));
  },
};
