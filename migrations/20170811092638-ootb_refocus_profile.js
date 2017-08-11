/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict';

module.exports = {
  up: function (qi, Sequelize) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
    return qi.sequelize.transaction(() =>
      qi.sequelize.query('UPDATE "Profiles" SET "aspectAccess" = \'rw\'' +
        ', "botAccess" = \'rw\', "eventAccess" = \'rw\'' +
        ', "lensAccess" = \'rw\', "perspectiveAccess" = \'rw\'' +
        ', "roomTypeAccess" = \'rw\', "sampleAccess" = \'rw\'' +
        ', "subjectAccess" = \'rw\', "userAccess" = \'rw\'' +
        ' WHERE "name"=\'RefocusUser\';'
      )
    );
  },

  down: function (qi, Sequelize) {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
    return qi.sequelize.transaction(() =>
      qi.sequelize.query('UPDATE "Profiles" SET "aspectAccess" = \'r\'' +
        ', "botAccess" = \'r\', "eventAccess" = \'r\'' +
        ', "lensAccess" = \'r\', "perspectiveAccess" = \'r\'' +
        ', "roomTypeAccess" = \'r\', "sampleAccess" = \'r\'' +
        ', "subjectAccess" = \'r\', "userAccess" = \'r\'' +
        ' WHERE "name"=\'RefocusUser\';'
      )
    );
  },
};
