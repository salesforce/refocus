/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./db/createOrUpdateDb.js
 *
 * This is called from the npm "checkdb" script, which is run as part of npm
 * prestart. If the database and table schema already exist, it just executes
 * migratedb to perform the necessary migrations to bring the db up to the
 * present. Otherwise, it creates the database, runs resetdb to create the
 * tables and indexes, and does "pseudo-migrations" to bring the migration
 * table up to date.
 */
const u = require('./utils');
const Sequelize = require('sequelize');
require('sequelize-hierarchy')(Sequelize);
const conf = require('../config');
const env = conf.environment[conf.nodeEnv];
const seq = new Sequelize(env.dbUrl, {
  logging: env.dbLogging,
});
const pgtools = require('pgtools');

console.log('\n\n in createOrUpdateDb \n\n');
/**
 * Create the database, run resetdb to create the tables and indexes, and do
 * "pseudo-migrations" to bring the migration table up to date.
 */
async function createAndReset() {
  try {
    const createDbResult = await u.createOrDropDb(pgtools.createdb);
    u.clog('createOrUpdateDb', 'createAndReset', createDbResult);
    
    const resetResult = await u.reset();
    u.clog('createOrUpdateDb', 'createAndReset', resetResult);
    
    process.exit(u.ExitCodes.OK); // eslint-disable-line no-process-exit
  } catch (err) {
    u.clog('createOrUpdateDb', 'createAndReset', err.message);
    process.exit(u.ExitCodes.ERROR); // eslint-disable-line no-process-exit
  }
}

async function main() {
  try {

    console.log('Before Sequelize Connection Check');

    try {
      await seq.authenticate();
      console.log('Sequelize connection has been established successfully.');
    } catch (error) {
      console.error('Unable to connect to the database:', error);
      // Handle the error appropriately, for example, by exiting the process
      process.exit(u.ExitCodes.ERROR);
    }

    console.log('After Sequelize Connection Check');

    const data = await seq.query(`
      select count(*) from information_schema.tables
      where table_schema = 'public'
    `);

    console.log('Inside seq.query then');

    if (data[0][0].count === '0') {
      // The database exists but the table schemas do not exist.
      const resetResult = await u.reset();
      u.clog('createOrUpdateDb', '', resetResult);
      process.exit(u.ExitCodes.OK); // eslint-disable-line no-process-exit
    } else {
      // The database AND the table schemas exist.
      require('./migrate.js'); // eslint-disable-line global-require
    }
  } catch (err) {
    console.error('Inside seq.query catch:', err);
    console.error('Error in createOrUpdateDb:', err); // Log the error details for debugging

    if (err.name === 'SequelizeConnectionError' && err.message === 'database "focusdb" does not exist') {
      // Database does not exist.
      await createAndReset();
    } else {
      // Some other error.
      u.clog('createOrUpdateDb', '', err.name + ': ' + err.message);
    }
  } finally {
    console.log('Finally block executed'); // Add this line for debugging
  }

  console.log('After seq.query');
}

main();