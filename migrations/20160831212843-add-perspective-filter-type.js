/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

'use strict';
const TBL = 'Perspectives';

module.exports = {
  up(qi, Sequelize) {
    return qi.sequelize.transaction(() =>
      qi.addColumn(TBL, 'aspectFilterType', {
        type: Sequelize.ENUM('INCLUDE', 'EXCLUDE'),
        defaultValue: 'INCLUDE',
        allowNull: false,
      })
      .then(() => qi.addColumn(TBL, 'aspectTagFilterType', {
        type: Sequelize.ENUM('INCLUDE', 'EXCLUDE'),
        defaultValue: 'INCLUDE',
        allowNull: false,
      }))
      .then(() => qi.addColumn(TBL, 'subjectTagFilterType', {
        type: Sequelize.ENUM('INCLUDE', 'EXCLUDE'),
        defaultValue: 'INCLUDE',
        allowNull: false,
      }))
      .then(() => qi.addColumn(TBL, 'statusFilterType', {
        type: Sequelize.ENUM('INCLUDE', 'EXCLUDE'),
        defaultValue: 'INCLUDE',
        allowNull: false,
      })));
  }, // up

  down(qi /* , Sequelize */) {
    return qi.sequelize.transaction(() =>
      qi.removeColumn(TBL, 'aspectFilterType')
      .then(() => qi.removeColumn(TBL, 'aspectTagFilterType'))
      .then(() => qi.removeColumn(TBL, 'subjectTagFilterType'))
      .then(() => qi.removeColumn(TBL, 'statusFilterType')));
  }, // down
};
