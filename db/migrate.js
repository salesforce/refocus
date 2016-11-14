/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./db/migrate.js
 *
 * Run this script from the command line (or npm package script) to perform the
 * current migration(s).
 */
const exec = require('child_process').exec;
const cmd = 'node_modules/.bin/sequelize db:migrate';

module.exports = exec(cmd, (error, stdout, stderr) => {
  // Log the results to the console.
  console.log('[./db/migrate (stdout)] ' + // eslint-disable-line no-console
    stdout);

  if (stderr) {
    console.log('[./db/migrate (stderr)] ' + // eslint-disable-line no-console
      stderr);
  }

  if (error !== null) {
    console.log('[./db/migrate] ' + // eslint-disable-line no-console
      error);
    process.exit(-1); // eslint-disable-line
  }

  process.exit(0); // eslint-disable-line
});
