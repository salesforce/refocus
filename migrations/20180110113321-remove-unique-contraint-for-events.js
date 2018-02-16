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
      'ALTER TABLE "Events" ' +
      'DROP CONSTRAINT IF EXISTS SpecificEvent;'
    )
    .then(() => qi.removeIndex('Events', 'SpecificEvent'));
  },

  down(qi) {
    return qi.sequelize.query(
      'ALTER TABLE "Events" DROP CONSTRAINT IF EXISTS BotActionsIdx;'
    )
    .then(() =>
      qi.addIndex('Events', ['roomId', 'botId'], {
        indexName: 'SpecificEvent',
        indicesType: 'UNIQUE',
      }));
  },
};
