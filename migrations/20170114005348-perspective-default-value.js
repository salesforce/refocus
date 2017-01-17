/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict';
const constants = require('../db/constants');

module.exports = {
  up(qi, Sequelize) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return qi.createTable('users', { id: Sequelize.INTEGER });
    */
    return qi.sequelize.transaction(() =>
    qi.changeColumn('Perspectives', 'aspectFilter', {
      type: Sequelize.ARRAY(Sequelize.STRING(constants.fieldlen.normalName)),
      defaultValue: constants.defaultArrayValue,
    })
    .then(() => qi.changeColumn('Perspectives', 'subjectTagFilter', {
      type: Sequelize.ARRAY(Sequelize.STRING(constants.fieldlen.normalName)),
      defaultValue: constants.defaultArrayValue,
    }))
    .then(() => qi.changeColumn('Perspectives', 'aspectTagFilter', {
      type: Sequelize.ARRAY(Sequelize.STRING(constants.fieldlen.normalName)),
      defaultValue: constants.defaultArrayValue,
    }))
    .then(() => qi.changeColumn('Perspectives', 'statusFilter', {
      type: Sequelize.ARRAY(Sequelize.STRING(constants.fieldlen.normalName)),
      defaultValue: constants.defaultArrayValue,
    }))
    .then(() => qi.sequelize.query('ALTER TABLE ONLY "Perspectives" ' +
      'ALTER COLUMN "aspectFilterType" SET DEFAULT ? ', {
        replacements: ['EXCLUDE'],
        type: qi.sequelize.QueryTypes.ALTER,
      }))
    .then(() => qi.sequelize.query('ALTER TABLE ONLY "Perspectives" ' +
      'ALTER COLUMN "subjectTagFilterType" SET DEFAULT ? ', {
        replacements: ['EXCLUDE'],
        type: qi.sequelize.QueryTypes.ALTER,
      }))
    .then(() => qi.sequelize.query('ALTER TABLE ONLY "Perspectives" ' +
      'ALTER COLUMN "aspectTagFilterType" SET DEFAULT ? ', {
        replacements: ['EXCLUDE'],
        type: qi.sequelize.QueryTypes.ALTER,
      }))
    .then(() => qi.sequelize.query('ALTER TABLE ONLY "Perspectives" ' +
      'ALTER COLUMN "statusFilterType" SET DEFAULT ? ', {
        replacements: ['EXCLUDE'],
        type: qi.sequelize.QueryTypes.ALTER,
      }))
    );
  },

  down(qi, Sequelize) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return qi.dropTable('users');
    */
    return qi.sequelize.transaction(() =>
    qi.changeColumn('Perspectives', 'aspectFilter', {
      type: Sequelize.ARRAY(Sequelize.STRING(constants.fieldlen.normalName)),
    })
    .then(() => qi.changeColumn('Perspectives', 'subjectTagFilter', {
      type: Sequelize.ARRAY(Sequelize.STRING(constants.fieldlen.normalName)),
    }))
    .then(() => qi.changeColumn('Perspectives', 'aspectTagFilter', {
      type: Sequelize.ARRAY(Sequelize.STRING(constants.fieldlen.normalName)),
    }))
    .then(() => qi.changeColumn('Perspectives', 'statusFilter', {
      type: Sequelize.ARRAY(Sequelize.STRING(constants.fieldlen.normalName)),
    }))
    .then(() => qi.sequelize.query('ALTER TABLE ONLY "Perspectives" ' +
      'ALTER COLUMN "aspectFilterType" SET DEFAULT ? ', {
        replacements: ['INCLUDE'],
        type: qi.sequelize.QueryTypes.ALTER,
      }))
    .then(() => qi.sequelize.query('ALTER TABLE ONLY "Perspectives" ' +
      'ALTER COLUMN "subjectTagFilterType" SET DEFAULT ? ', {
        replacements: ['INCLUDE'],
        type: qi.sequelize.QueryTypes.ALTER,
      }))
    .then(() => qi.sequelize.query('ALTER TABLE ONLY "Perspectives" ' +
      'ALTER COLUMN "aspectTagFilterType" SET DEFAULT ? ', {
        replacements: ['INCLUDE'],
        type: qi.sequelize.QueryTypes.ALTER,
      }))
    .then(() => qi.sequelize.query('ALTER TABLE ONLY "Perspectives" ' +
      'ALTER COLUMN "statusFilterType" SET DEFAULT ? ', {
        replacements: ['INCLUDE'],
        type: qi.sequelize.QueryTypes.ALTER,
      }))
    );
  },
};
