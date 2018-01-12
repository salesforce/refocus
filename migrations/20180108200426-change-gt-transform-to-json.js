/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict';
module.exports = {
  up(qi) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.
      Example:
      return qi.createTable('users', { id: Sequelize.INTEGER });
    */
    return qi.sequelize.transaction(() =>
      qi.sequelize.query('ALTER TABLE ONLY "GeneratorTemplates" ' +
      'ALTER COLUMN "transform" TYPE json USING transform::json ', {
        type: qi.sequelize.QueryTypes.ALTER,
      }));
  },

  down(qi, Sequelize) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.
      Example:
      return qi.dropTable('users');
    */
    return qi.sequelize.transaction(() =>
      qi.changeColumn('GeneratorTemplates', 'transform', {
        type: Sequelize.TEXT,
        allowNull: false,
      }));
  },
};
