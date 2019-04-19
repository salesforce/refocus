'use strict';
const TBL = 'Rooms';
const constants = require('../db/constants');
module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.addColumn(
      TBL,
      'origin', {
        type: Sequelize.STRING(constants.fieldlen.normalName),
        allowNull: true,
        default: 'other',
        validate: {
          is: constants.nameRegex,
        },
      }
    ),

  down: (queryInterface) =>
    queryInterface.removeColumn(TBL, 'origin'
    ),
};
