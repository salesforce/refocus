/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
'use strict';

module.exports = {
  up(qi /* , Sequelize */) {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return qi.createTable('users', { id: Sequelize.INTEGER });
    */
    return qi.sequelize.transaction(() =>
      qi.sequelize.query('Delete from "Samples" where "subjectId" in ' +
        ' (Select "id" from "Subjects" where "isDeleted" > 0 ' +
        ' or "isPublished" = false)', {
          type: qi.sequelize.QueryTypes.DELETE,
        }));
  },

  down(qi /* , Sequelize */) { // NO-OP
    /*
     * There is no "down" function defined in this migration, i.e. there is
     * nothing to undo here to restore the database to a desired state.
     */

  },
};
