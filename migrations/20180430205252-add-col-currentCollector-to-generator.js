'use strict';
const TBL = 'Generators';
const constants = require('../db/constants');

module.exports = {
  up(qi, Sequelize) {
    return qi.addColumn(TBL, 'currentCollector', {
      type: Sequelize.STRING(constants.fieldlen.normalName),
      allowNull: true,
      validate: {
        is: constants.nameRegex,
      },
    });
  },

  down(qi, Sequelize) {
    return qi.removeColumn(TBL, 'currentCollector');
  },
};
