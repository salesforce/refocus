/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./db/migrateUndo.js
 *
 * Run this script from the command line (or npm package script) to revert the
 * current migration(s).
 */
const exec = require('child_process').exec;
const cmd = 'node_modules/.bin/sequelize db:migrate:undo';

module.exports = exec(cmd, (error, stdout, stderr) => {
  // Log the results to the console.
  console.log(// eslint-disable-line no-console
    '[./db/migrateUndo (stdout)] ' + stdout);

  if (stderr) {
    console.log(// eslint-disable-line no-console
      '[./db/migrateUndo (stderr)] ' + stderr);
  }

  if (error !== null) {
    console.log('[./db/migrateUndo] ' + // eslint-disable-line no-console
      error);
    process.exit(-1); // eslint-disable-line
  }

  process.exit(0); // eslint-disable-line
});
