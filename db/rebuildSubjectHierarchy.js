/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/rebuildSubjectHierarchy.js
 */
const utils = require('./utils.js');

utils.doImport()
.then(() => {
  utils.seq.models.Subject.rebuildHierarchy()
  .then(() => {
    console.log('Successfully rebuild Subject Hierarchy.'); // eslint-disable-line no-console
    process.exit(0);
  })
  .catch((err) => {
    console.log(err); // eslint-disable-line no-console
    process.exit(1);
  });
});
