/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

'use strict'; // eslint-disable-line strict

module.exports = {
  up: function (qi, Sequelize) {
    return qi.addColumn('Bots', 'ui', {
      type: Sequelize.BLOB,
      defaultValue: null,
    });
  },

  down: function (qi, Sequelize) {
    return qi.removeColumn('Bots', 'ui');
  },
};
