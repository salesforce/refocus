/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

const constants = require('../db/constants');

module.exports = {
  up: (queryInterface, Sequelize) =>
    queryInterface.addColumn(
      'BotActions',
      'actionLog',
      {
        type: Sequelize.STRING(constants.fieldlen.normalName),
        allowNull: true,
      }
    ),

  down: (queryInterface) =>
    queryInterface.removeColumn(
      'BotActions',
      'actionLog'
    ),
};
