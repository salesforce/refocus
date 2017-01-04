/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

'use strict'; // eslint-disable-line strict

module.exports = {
  up(qi, Sequelize) {
    return qi.addColumn('Users', 'sso', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
    });
  },

  down(qi /* , Sequelize */) {
    return qi.removeColumn('Users', 'sso');
  },
};
