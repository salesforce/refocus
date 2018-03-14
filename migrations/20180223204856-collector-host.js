/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * migrations/20180223204856-collector-host.js
 */
'use strict'; // eslint-disable-line strict
const TBL = 'Collectors';

module.exports = {
  up(qi, Sequelize) {
    let attr;
    return qi.sequelize.transaction(
      () => qi.describeTable(TBL)
      .then((attributes) => attr = attributes)
      .then(() => {
        if (!attr.hasOwnProperty('host')) {
          return qi.addColumn(TBL, 'host', {
            type: Sequelize.STRING(4096),
            allowNull: true,
          });
        }

        return true;
      })
      .then(() => {
        if (!attr.hasOwnProperty('ipAddress')) {
          return qi.addColumn(TBL, 'ipAddress', {
            type: Sequelize.STRING(60),
            allowNull: true,
          });
        }

        return true;
      })
    );
  },

  down(qi) {
    return qi.sequelize.transaction(() => qi.removeColumn(TBL, 'host')
    .then(() => qi.removeColumn(TBL, 'ipAddress')));
  },
};
