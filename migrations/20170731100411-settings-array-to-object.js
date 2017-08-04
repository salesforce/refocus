/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict';
const u = require('../db/helpers/roomTypeUtils');
const TBL = 'RoomTypes';

module.exports = {
  up: function (qi, Sequelize) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
    return qi.sequelize.transaction(() =>
      qi.sequelize.query('ALTER TABLE "RoomTypes" ALTER COLUMN "settings" DROP NOT NULL;' +
        'ALTER TABLE "RoomTypes" ALTER COLUMN "settings" DROP DEFAULT;' +
        'ALTER TABLE "RoomTypes" ALTER COLUMN "settings"' +
        'TYPE JSON USING json_build_object("settings");'));
  },

  down: function (qi, Sequelize) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */

    return qi.changeColumn(TBL, 'settings', {
      type: Sequelize.ARRAY(Sequelize.JSONB),
      allowNull: true,
      validate: {
        contains: u.validateSettingsArray,
      },
    });
  },
};
