/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./db/createOrDropDb.js
 *
 * Call this script from the command line to create or drop the db. Requires
 * a command line argument to indicate whether to create (--init, -i) or drop
 * (--drop, -d) the database.
 */
const commandLineArgs = require('command-line-args');
const pgtools = require('pgtools');
const u = require('./utils');
const cli = commandLineArgs([
  { name: 'init', alias: 'i', type: Boolean },
  { name: 'drop', alias: 'd', type: Boolean },
]);

/**
 * Must be called with one and only one arg. Throws error if invalid arg count.
 *
 * @param {Array} args - Array of keys from the command line args.
 * @throws {Error} - No args or more than one arg.
 */
function validateArgCount(args) {
  if (args.length !== 1) { // eslint-disable-line no-magic-numbers
    throw new Error();
  }
} // validateArgCount

try {
  // Parse the command line options
  const options = cli.parse();
  const keys = Object.keys(options);

  // Make sure we only have one command line arg. More or less is an error.
  validateArgCount(keys);

  // Create or drop the database.
  if (keys.includes('init')) {
    u.createOrDropDb(pgtools.createdb)
    .then((res) => {
      u.clog('createOrDropDb', '', res);
    })
    .catch((err) => {
      u.clog('createOrDropDb', '', err.message);
    });
  } else {
    u.createOrDropDb(pgtools.dropdb)
    .then((res) => {
      u.clog('createOrDropDb', '', res);
    })
    .catch((err) => {
      u.clog('createOrDropDb', '', err.message);
    });
  }
} catch (err) {
  u.clog('createOrDropDb', '',
      'Script must be called with one command line arg: ' +
      '--init OR -i OR --drop OR -d.');
}
