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
const logger = require('@salesforce/refocus-logging-client');
const cmd = 'node_modules/.bin/sequelize db:migrate';

module.exports = exec(cmd, (error, stdout, stderr) => {
  // Log the results to the console.
  logger.info('[./db/migrate (stdout)] ' +
    stdout);

  if (stderr) {
    logger.info('[./db/migrate (stderr)] ' +
      stderr);
  }

  if (error !== null) {
    logger.info('[./db/migrate] ' +
      error);
    process.exit(-1); // eslint-disable-line
  }

  process.exit(0); // eslint-disable-line
});
