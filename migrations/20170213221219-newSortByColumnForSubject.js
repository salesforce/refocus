'use strict';
const constants = require('../db/constants');

module.exports = {
  up: function (qi, Sequelize) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

    */
    return qi.sequelize.transaction(() => qi.changeColumn('Subjects', 'sortBy', {
      defaultValue: '',
      validate: {
        is: /^[0-9a-z_-]*$/i,
      },
    }));
  },

  down: function (qi, Sequelize) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.
    */
    return qi.sequelize.transaction(() => qi.changeColumn('Subjects', 'sortBy', {
      defaultValue: undefined,
      validate: {
        is: /^[0-9a-z_-]+$/i,
      },
    }));
  },
};
