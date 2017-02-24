'use strict';
const constants = require('../db/constants');

module.exports = {
  up: function (qi, Sequelize) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.
    */
    return qi.sequelize.transaction(() => qi.removeColumn('Samples', 'id'));
  },

  down: function (qi, Sequelize) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.
    */
    return qi.sequelize.transaction(() => qi.addColumn('Samples', 'id', {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4,
    }));
  },
};
