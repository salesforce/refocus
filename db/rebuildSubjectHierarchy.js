/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/rebuildSubjectHierarchy.js
 *
 * The sequelize-hierarchy module maintains the Subjectsancestors table,
 * but data in that table may occasionally become corrupt.
 * The sequelize-hierarchy module actually updates Subjectsancestors tables in a
 * "beforeUpdate" hook, so sequelize-hierarchy commits an update to the Subjectancestors
 * table before the commit to the Subject table. If the commit to the Subject table is
 * rejected and throws an error, this could result in the Subject and Subjectancestors
 * tables being out of sync. If this occurs, you may run this script to rebuild
 * the subject hierarchy by regenerating the Subjectancestors data based on the actual
 * data in the Subject table.
 */
const utils = require('./utils.js');

utils.doImport()
.then(() => {
  utils.seq.models.Subject.rebuildHierarchy()
  .then(() => {
    console.log('Successfully rebuilt Subject Hierarchy.'); // eslint-disable-line no-console
    process.exit(0);
  })
  .catch((err) => {
    console.log(err); // eslint-disable-line no-console
    process.exit(1);
  });
});
