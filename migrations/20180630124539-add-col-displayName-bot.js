/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * migrations/20180630124536-add-col-displayName-bot.js
 */
'use strict'; // eslint-disable-line strict
const TBL = 'Bots';

module.exports = {
  up(qi, Sequelize) {
    let attr;
    return qi.sequelize.transaction(
      () => qi.describeTable(TBL)
        .then((attributes) => attr = attributes)
        .then(() => {
          if (!attr.hasOwnProperty('displayName')) {
            return qi.addColumn(TBL, 'displayName', {
              type: Sequelize.STRING(60),
              allowNull: true,
            });
          }

          return true;
        })
    );
  },

  down(qi) {
    return qi.sequelize.transaction(() =>
      qi.removeColumn(TBL, 'displayName'));
  },
};
