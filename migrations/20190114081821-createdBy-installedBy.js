/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * migrations/20190102164503-add-created-by-column.js
 */

'use strict';

module.exports = {
  up(qi, Sequelize) {
    return qi.addColumn('Rooms', 'createdBy', {
      type: Sequelize.UUID,
      references: {
        model: 'Users',
        key: 'id',
      },
    })
    .then(() => qi.addColumn('RoomTypes', 'createdBy', {
      type: Sequelize.UUID,
      references: {
        model: 'Users',
        key: 'id',
      },
    }))
    .then(() => qi.addColumn('BotData', 'createdBy', {
      type: Sequelize.UUID,
      references: {
        model: 'Users',
        key: 'id',
      },
    }))
    .then(() => qi.addColumn('Bots', 'installedBy', {
      type: Sequelize.UUID,
      references: {
        model: 'Users',
        key: 'id',
      },
    }));
  },

  down(qi, Sequelize) {
    return qi.removeColumn('Rooms', 'createdBy')
      .then(() => qi.removeColumn('RoomTypes', 'createdBy'))
      .then(() => qi.removeColumn('BotData', 'createdBy'))
      .then(() => qi.removeColumn('Bots', 'installedBy'));
  },
};
