/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict';

const arr = [];

module.exports = {
  up(qi /* , Sequelize */) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return qi.createTable('users', { id: Sequelize.INTEGER });
    */
    return qi.sequelize.transaction(() =>
      qi.sequelize.query('Update "Perspectives" Set "aspectFilterType" = $1,' +
      ' "aspectFilter" = $2 where "aspectFilterType" = $3 and ("aspectFilter"' +
      ' is null or "aspectFilter" = $4) ', {
        bind: ['EXCLUDE', arr, 'INCLUDE', arr],
        type: qi.sequelize.QueryTypes.UPDATE,
      })
    .then(() =>
      qi.sequelize.query('Update "Perspectives"' +
      ' Set "subjectTagFilterType" = $1, "subjectTagFilter" = $2' +
      ' where "subjectTagFilterType" = $3 and ("subjectTagFilter"' +
      ' is null or "subjectTagFilter" = $4)', {
        bind: ['EXCLUDE', arr, 'INCLUDE', arr],
        type: qi.sequelize.QueryTypes.UPDATE,
      }))
    .then(() =>
      qi.sequelize.query('Update "Perspectives"' +
      '  Set "aspectTagFilterType" = $1, "aspectTagFilter" = $2' +
      ' where "aspectTagFilterType" = $3 and ("aspectTagFilter"' +
      ' is null or "aspectTagFilter" = $4)', {
        bind: ['EXCLUDE', arr, 'INCLUDE', arr],
        type: qi.sequelize.QueryTypes.UPDATE,
      }))
    .then(() =>
      qi.sequelize.query('Update "Perspectives" Set' +
      ' "statusFilterType" = $1, "statusFilter" = $2' +
      ' where "statusFilterType" = $3 and' +
      ' ("statusFilter" is null or "statusFilter" = $4)', {
        bind: ['EXCLUDE', arr, 'INCLUDE', arr],
        type: qi.sequelize.QueryTypes.UPDATE,
      }))
    );
  },

  down(qi /* , Sequelize */) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return qi.dropTable('users');
    */
    return qi.sequelize.transaction(() =>
    qi.sequelize.query('Update "Perspectives"' +
      ' Set "aspectFilterType" = $1, "aspectFilter" = null' +
      ' where "aspectFilterType" = $2 and "aspectFilter" = $3', {
        bind: ['INCLUDE', 'EXCLUDE', arr],
        type: qi.sequelize.QueryTypes.UPDATE,
      })
    .then(() => qi.sequelize.query('Update "Perspectives"' +
      ' Set "subjectTagFilterType" = $1, "subjectTagFilter" = null' +
      ' where "subjectTagFilterType" = $2 and "subjectTagFilter" = $3', {
        bind: ['INCLUDE', 'EXCLUDE', arr],
        type: qi.sequelize.QueryTypes.UPDATE,
      }))
    .then(() => qi.sequelize.query('Update "Perspectives"' +
      ' Set "aspectTagFilterType" = $1, "aspectTagFilter" = null' +
      ' where "aspectTagFilterType" = $2 and "aspectTagFilter" = $3', {
        bind: ['INCLUDE', 'EXCLUDE', arr],
        type: qi.sequelize.QueryTypes.UPDATE,
      }))
    .then(() => qi.sequelize.query('Update "Perspectives"' +
      ' Set "statusFilterType" = $1, "statusFilter" = null' +
      ' where "statusFilterType" = $2 and "statusFilter" = $3', {
        bind: ['INCLUDE', 'EXCLUDE', arr],
        type: qi.sequelize.QueryTypes.UPDATE,
      }))
    );
  },
};
