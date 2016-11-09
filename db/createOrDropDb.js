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
 * Creates or deletes the configured db, depending on
 * the option after the filename.
 */

const commandLineArgs = require('command-line-args');
const pgtools = require('pgtools');
const u = require('./utils');
const conf = require('../config');
const env = conf.environment[conf.nodeEnv];
const DB_URL = env.dbUrl;
const cli = commandLineArgs([
  { name: 'init', alias: 'i', type: Boolean },
  { name: 'drop', alias: 'd', type: Boolean },
]);

// example DB_URL: 'postgres://username:password@host:port/name'
const dbConfig = {
  name: DB_URL.split('/').pop(),
  user: DB_URL.split(':')[1].slice(2),
  password: DB_URL.split(':')[2].split('@')[0],
  host: DB_URL.split('@').pop().split(':')[0],
  port: DB_URL.split(':').pop().split('/')[0],
};

/**
 * Create the database.
 *
 * @param {Object} dbcnf - Database configuration object.
 */
function createDb(dbcnf) {
  pgtools.createdb(dbcnf, dbcnf.name, (err, res) => {
    if (err) {
      if (err.name === 'duplicate_database') {
        u.clog('createOrDropDb', 'createDb',
          `Can't create "${dbcnf.name}" because it already exists!`);
      } else {
        u.clog('createOrDropDb', 'createDb', err.name);
      }

      process.exit(u.ExitCodes.ERROR); // eslint-disable-line no-process-exit
    }

    // Successfully created
    u.clog('createOrDropDb', 'createDb',
      `${res.command} "${dbcnf.name}"... OK`);
    process.exit(u.ExitCodes.OK); // eslint-disable-line no-process-exit
  });
} // createDb

/**
 * Drop the database.
 *
 * @param {Object} dbcnf - Database configuration object.
 */
function dropDb(dbcnf) {
  pgtools.dropdb(dbcnf, dbcnf.name, (err, res) => {
    if (err) {
      if (err.name === 'invalid_catalog_name') {
        u.clog('createOrDropDb', 'dropDb',
          `Can't drop "${dbcnf.name}" because it does not exist!`);
      } else {
        u.clog('createOrDropDb', 'dropDb', err.name);
      }

      process.exit(u.ExitCodes.ERROR); // eslint-disable-line no-process-exit
    }

    // Successfully dropped
    u.clog('createOrDropDb', 'dropDb',
      `${res.command} "${dbcnf.name}"... OK`);
    process.exit(u.ExitCodes.OK); // eslint-disable-line no-process-exit
  });
} // dropDb

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
    createDb(dbConfig);
  } else {
    dropDb(dbConfig);
  }
} catch (err) {
  u.clog('createOrDropDb', '',
      'Script must be called with one command line arg: ' +
      '--init OR -i OR --drop OR -d.');
}
