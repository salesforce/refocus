/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict'; // eslint-disable-line strict
const TBL = 'Profiles';

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
      'ADD COLUMN "botAccess" "enum_Profiles_botAccess"', {
        type: qi.sequelize.QueryTypes.ALTER,
      })
    .then(() => qi.sequelize.query('ALTER TABLE ONLY "Profiles" ' +
      'ADD COLUMN "eventAccess" "enum_Profiles_eventAccess"', {
        type: qi.sequelize.QueryTypes.ALTER,
      }))
    .then(() => qi.sequelize.query('ALTER TABLE ONLY "Profiles" ' +
      'ADD COLUMN "roomAccess" "enum_Profiles_roomAccess"', {
        type: qi.sequelize.QueryTypes.ALTER,
      }))
    .then(() => qi.sequelize.query('ALTER TABLE ONLY "Profiles" ' +
      'ADD COLUMN "roomTypeAccess" "enum_Profiles_roomTypeAccess"', {
        type: qi.sequelize.QueryTypes.ALTER,
      }))
    );
  },

  down(qi /* , Sequelize*/) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return qi.dropTable('users');
    */
    return qi.sequelize.transaction(() =>
    qi.removeColumn(TBL, 'botAccess'))
    .then(() => qi.removeColumn(TBL, 'eventAccess'))
    .then(() => qi.removeColumn(TBL, 'roomAccess'))
    .then(() => qi.removeColumn(TBL, 'roomTypeAccess'));
  },
};
