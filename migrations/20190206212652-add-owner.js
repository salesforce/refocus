/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict';

const columnName = 'ownerId';
const tablesToModify = [
  'Aspects',
  'BotActions',
  'BotData',
  'Bots',
  'CollectorGroups',
  'Collectors',
  'Events',
  'Generators',
  'GeneratorTemplates',
  'Lenses',
  'Perspectives',
  'Rooms',
  'RoomTypes',
  'Subjects',
];

module.exports = {
  up: (qi, Sequelize) => {
    const columnDef = {
      type: Sequelize.UUID,
      references: {
        model: 'Users',
        key: 'id',
      },
    };

    return Promise.all(
      tablesToModify.map((modelName) =>
        qi.addColumn(modelName, columnName, columnDef)
      )
    );
  },

  down: (qi, Sequelize) =>
    Promise.all(
      tablesToModify.map((modelName) =>
        qi.removeColumn(modelName, columnName)
      )
    ),
};

