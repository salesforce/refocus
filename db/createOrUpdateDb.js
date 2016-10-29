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
 * If database and table schema already exist, just execute migratedb to
 * perform the necessary migrations to bring the db up to the present.
 * Otherwise, create the database, run resetdb to create the tables and
 * indexes, and do "pseudo-migrations" to bring the migration table up to date.
 */
const models = require('./index');
const pgtools = require('pgtools');
const utils = require('./utils');

/*
 * If this is running in a Heroku Private Space, just exit (ref.
 * createOrUpdatePrivateDb.js).
 */
// if (utils.isInHerokuPrivateSpace()) {
//   console.log('Exiting "./db/createOrUpdateDb" because db is running in a ' +
//     'Heroku Private Space');
//   process.exit(0); // eslint-disable-line
// }

console.log('querying information_schema.tables where table_schema = \'public\'');
models.sequelize.query(`select count(*) from
  information_schema.tables where table_schema = 'public'`)
.then((data) => {
  console.log('found', data); // eslint-disable-line
  if (data[0][0].count === '0') { // eslint-disable-line
    require('./reset.js'); // eslint-disable-line global-require
  } else {
    require('./migrate.js'); // eslint-disable-line global-require
  }
})
.catch((err) => {
  // console.log('caught err', err);
  // if (err.name === 'SequelizeConnectionError' &&
  //   err.message.startsWith('connect ETIMEDOUT')) {
  //   console.log('Exiting "./db/createOrUpdateDb"... ' +
  //     'SequelizeConnectionError: connect ETIMEDOUT');
  //   process.exit(0); // eslint-disable-line
  // }

  const dbConfig = utils.dbConfigObjectFromDbURL();
  console.log('create db now', dbConfig); // eslint-disable-line
  pgtools.createdb(dbConfig, dbConfig.name, (err2, res) => {
    if (err2) {
      console.error('ERROR', err2); // eslint-disable-line
      process.exit(1); // eslint-disable-line
    }

    console.log(`${res.command} "${dbConfig.name}"... OK`); // eslint-disable-line
    require('./reset.js'); // eslint-disable-line global-require
    // require('./migrate.js'); // eslint-disable-line global-require
  });
});
