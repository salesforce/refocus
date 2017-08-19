/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

'use strict';
const constants = require('../db/constants');
const TBL = 'Perspectives';

module.exports = {
  up(qi, Sequelize) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return qi.createTable('users', { id: Sequelize.INTEGER });
    */
    return qi.removeColumn(TBL, 'query')
    .then(() => qi.addColumn(TBL, 'rootSubject', {
      type: Sequelize.STRING(constants.fieldlen.longish),
      allowNull: false,
    }))
    .then(() => qi.addColumn(TBL, 'aspectFilter', {
      type: Sequelize.ARRAY(Sequelize.STRING(constants.fieldlen.normalName)),
    }))
    .then(() => qi.addColumn(TBL, 'aspectTagFilter', {
      type: Sequelize.ARRAY(Sequelize.STRING(constants.fieldlen.normalName)),
    }))
    .then(() => qi.addColumn(TBL, 'subjectTagFilter', {
      type: Sequelize.ARRAY(Sequelize.STRING(constants.fieldlen.normalName)),
    }))
    .then(() => qi.addColumn(TBL, 'statusFilter', {
      type: Sequelize.ARRAY(Sequelize.STRING),
    }));
  },

  down(qi, Sequelize) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return qi.dropTable('users');
    */
    return qi.removeColumn(TBL, 'statusFilter')
    .then(() => qi.removeColumn(TBL, 'subjectTagFilter'))
    .then(() => qi.removeColumn(TBL, 'aspectTagFilter'))
    .then(() => qi.removeColumn(TBL, 'aspectFilter'))
    .then(() => qi.removeColumn(TBL, 'rootSubject'))
    .then(() => qi.addColumn(TBL, 'query', {
      type: Sequelize.STRING(20480),
    }));
  },
};
