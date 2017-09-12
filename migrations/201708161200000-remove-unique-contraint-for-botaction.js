/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

'use strict'; // eslint-disable-line strict

module.exports = {
  up(qi, Sequelize) {
    let attr;
    return qi.describeTable('Bots')
    .then((attributes) => {
      attr = attributes;
      if (!attr.hasOwnProperty('settings')) {
        return qi.addColumn('Bots', 'settings', {
          type: Sequelize.BLOB,
          defaultValue: null,
        });
      }

      return true;
    })
    .then(() => {
      return qi.sequelize.query(
        'ALTER TABLE "BotActions"' +
        'DROP CONSTRAINT IF EXISTS BotActionUniqueNameisPending;'
      );
    })
    .then(() => {
      return qi.removeIndex('BotActions', 'BotActionUniqueNameisPending');
    });
  },

  down(qi) {
    let attr;
    return qi.sequelize.query(
      'ALTER TABLE "BotActions" DROP CONSTRAINT IF EXISTS BotActionsIdx;'
    )
    .then(() => {
      return qi.addIndex('BotActions', ['name', 'isPending'], {
        indexName: 'BotActionUniqueNameisPending',
        indicesType: 'UNIQUE'
      });
    })
    .then(() => {
      return qi.describeTable('Bots');
    })
    .then((attributes) => {
      attr = attributes;
      if (attr.hasOwnProperty('settings')) {
        return qi.removeColumn('Bots', 'settings');
      }

      return true;
    });
  },
};
