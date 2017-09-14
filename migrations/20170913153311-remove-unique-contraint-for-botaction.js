/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

'use strict'; // eslint-disable-line strict

module.exports = {
  up(qi) {
    return qi.sequelize.query(
      'ALTER TABLE "BotActions" ' +
      'DROP CONSTRAINT IF EXISTS BotActionUniqueNameisPending;'
    )
    .then(() => qi.removeIndex('BotActions', 'BotActionUniqueNameisPending'));
  },

  down(qi) {
    return qi.sequelize.query(
      'ALTER TABLE "BotActions" DROP CONSTRAINT IF EXISTS BotActionsIdx;'
    )
    .then(() =>
      qi.addIndex('BotActions', ['name', 'isPending'], {
        indexName: 'BotActionUniqueNameisPending',
        indicesType: 'UNIQUE',
      }));
  },
};
