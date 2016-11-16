/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * Because a deployment may have a poorly-defined GlobalConfigs table at this
 * time, this migration tests for the existence of the "createdAt" field and
 * only drops the table if that field does not exist. After this migration,
 * when the server starts up and index.js calls sync on all the models, the
 * GlobalConfigs table will be created properly.
 */
'use strict';
const tableName = 'GlobalConfigs';

module.exports = {
  up: function (queryInterface, Sequelize) {
    return queryInterface.describeTable(tableName)
    .then((attributes) => {
      return 'createdAt' in attributes;
    })
    .then((hasCreatedAtField) => {
      if (!hasCreatedAtField) {
        return queryInterface.dropTable(tableName);
      }

      return true;
    });
  },

  down: function (queryInterface, Sequelize) {
    /*
     * There is no "down" function defined in this migration, i.e. there is
     * nothing to undo here to restore the database to a desired state.
     */
  }
};
