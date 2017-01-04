/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict';

module.exports = {
  up(qi, Sequelize) {
    return qi.sequelize.transaction(() => qi.createTable('GlobalConfig', {
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
    }));
  }, // up

  down(qi /* , Sequelize */) {
    return qi.sequelize.transaction(() => qi.dropTable('GlobalConfig'));
  }, // down
};

