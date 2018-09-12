/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * migrations/20180912130513-add-docsUrl-and-ownerUrl.js
 */
'use strict'; // eslint-disable-line strict
const TBL = 'Bots';
const constants = require('../db/constants');

module.exports = {
  up(qi, Sequelize) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

    */
    return qi.sequelize.transaction(() =>
      qi.addColumn(TBL, 'docsUrl', {
        type: Sequelize.STRING(),
        allowNull: true,
        validate: { isUrl: true },
      })
      .then(() => qi.addColumn(TBL, 'ownerUrl', {
        type: Sequelize.STRING(),
        allowNull: true,
        validate: { isUrl: true },
      }))
    );
  },

  down(qi) {
    return qi.sequelize.transaction(() =>
      qi.removeColumn(TBL, 'docsUrl')
      .then(() => qi.removeColumn(TBL, 'ownerUrl'))
    );
  },
};
