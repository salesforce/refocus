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
 *
 * Note: if running in heroku then we don't have to run the migration during
 * prestart because heroku is running it on release!
 */
const Sequelize = require('sequelize');
require('sequelize-hierarchy')(Sequelize);
const conf = require('../config');
const env = conf.environment[conf.nodeEnv];
const seq = new Sequelize(env.dbUrl, {
  logging: env.dbLogging,
});
const pgtools = require('pgtools');
const u = require('./utils');

/**
 * Create the database, run resetdb to create the tables and indexes, and do
 * "pseudo-migrations" to bring the migration table up to date.
 */
function createAndReset() {
  u.createOrDropDb(pgtools.createdb)
  .then((res) => {
    u.clog('createOrUpdateDb', 'createAndReset', res);
    return u.reset();
  })
  .then((res) => {
    u.clog('createOrUpdateDb', 'createAndReset', res);
    process.exit(u.ExitCodes.OK); // eslint-disable-line no-process-exit
  })
  .catch((err) => {
    u.clog('createOrUpdateDb', 'createAndReset', err.message);
    process.exit(u.ExitCodes.ERROR); // eslint-disable-line no-process-exit
  });
} // createAndReset

seq.query(`select count(*) from
  information_schema.tables where table_schema = 'public'`)
.then((data) => {
  if (data[0][0].count === '0') { // eslint-disable-line
    // The database exists but the table schemas do not exist.
    u.reset()
    .then((res) => {
      u.clog('createOrUpdateDb', '', res);
      process.exit(u.ExitCodes.OK); // eslint-disable-line no-process-exit
    })
    .catch((err) => {
      u.clog('createOrUpdateDb', '', err.message);
      process.exit(u.ExitCodes.ERROR); // eslint-disable-line no-process-exit
    });
  } else {
    /*
     * The database AND the table schemas already exist. If we're running on
     * heroku then we're done because db migrations are handled in the release
     * phase. Otherwise, do the db migrations now.
     */
    if (process.env.IS_HEROKU && process.env.IS_HEROKU === 'true') {
      process.exit(u.ExitCodes.OK); // eslint-disable-line no-process-exit
    } else {
      require('./migrate.js'); // eslint-disable-line global-require
    }
  }
})
.catch((err) => {
  if (err.name === 'SequelizeConnectionError' &&
    err.message === 'database "focusdb" does not exist') {
    // Database does not exist.
    createAndReset();
  } else {
    // Some other error.
    u.clog('createOrUpdateDb', '', err.name + ': ' + err.message);
  }
});
