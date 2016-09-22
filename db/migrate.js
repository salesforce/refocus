/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./db/migrate.js
 * Migrate db from current state to next state
*/

const exec = require('child_process').exec;
const cmd = 'node_modules/.bin/sequelize db:migrate';

module.exports = exec(cmd, (error, stdout, stderr) => {
  // console statements for migration results.
  console.log('stdout: ' + stdout); // eslint-disable-line no-console
  if (stderr) {
    console.log('stderr: ' + stderr); // eslint-disable-line no-console
    process.exit(1); // eslint-disable-line
  }

  if (error !== null) {
    console.log('exec error: ' + error); // eslint-disable-line no-console
    process.exit(1); // eslint-disable-line
  }

  process.exit(0); // eslint-disable-line
});
