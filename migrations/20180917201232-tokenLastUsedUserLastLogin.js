/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * migrations/20180917201232-tokenLastUsedUserLastLogin.js
 */
'use strict'; // eslint-disable-line strict

module.exports = {
  up(qi, Seq) {
    const opts = {
      type: Seq.DATE,
      defaultValue: Date.now(),
    };
    return qi.sequelize.transaction(
      () => qi.addColumn('Tokens', 'lastUsed', opts)
      .then(() => qi.addColumn('Users', 'lastLogin', opts))
    );
  },

  down(qi) {
    return qi.sequelize.transaction(
      () => qi.removeColumn('Tokens', 'lastUsed')
      .then(() => qi.removeColumn('Users', 'lastLogin'))
    );
  },
};
