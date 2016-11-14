/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./db/reset.js
 *
 * Resets the db as it is defined in db/index.js and brings the SequelizeMeta
 * migrations up to date.
 */
const u = require('./utils');

module.exports = u.reset()
.then((res) => {
  u.clog('reset', '', res);
  process.exit(u.ExitCodes.OK); // eslint-disable-line no-process-exit
})
.catch((err) => {
  u.clog('reset', '', err);
  process.exit(u.ExitCodes.ERROR); // eslint-disable-line no-process-exit
});
