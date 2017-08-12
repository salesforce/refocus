/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict'; // eslint-disable-line strict
module.exports = {
  up(qi /* , Sequelize */) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return qi.createTable('users', { id: Sequelize.INTEGER });
    */
    return qi.sequelize.transaction(() =>
     qi.sequelize.query('ALTER TABLE ONLY "Profiles" ' +
      'ALTER COLUMN "botAccess" SET DEFAULT ? ', {
        replacements: ['r'],
        type: qi.sequelize.QueryTypes.ALTER,
      })
    .then(() => qi.sequelize.query('ALTER TABLE ONLY "Profiles" ' +
      'ALTER COLUMN "eventAccess" SET DEFAULT ? ', {
        replacements: ['r'],
        type: qi.sequelize.QueryTypes.ALTER,
      }))
    .then(() => qi.sequelize.query('ALTER TABLE ONLY "Profiles" ' +
      'ALTER COLUMN "roomAccess" SET DEFAULT ? ', {
        replacements: ['rw'],
        type: qi.sequelize.QueryTypes.ALTER,
      }))
    .then(() => qi.sequelize.query('ALTER TABLE ONLY "Profiles" ' +
      'ALTER COLUMN "roomTypeAccess" SET DEFAULT ? ', {
        replacements: ['r'],
        type: qi.sequelize.QueryTypes.ALTER,
      }))
    );
  },

  down(/* qi, Sequelize */) { // NO-OP
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return qi.dropTable('users');
    */
  },
};
