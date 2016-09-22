/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./db/createOrUpdatePrivateDb.js
 *
 * This is script is for private space installation
 * First check whethere table is present or not
 * If tables are present then performs migratedb otherwise resetdb to
 * create new tables and false migrations to keep migration table up to date
 *
 */

const models = require('./index');
const conf = require('../config');
const utils = require('./utils');

// Heroku Private space postgres contains IP in host so check wthether
// it is IP or not, if it is IP then perform reset or migratedb
if (utils.isInHerokuPrivateSpace()) {
  models.sequelize.query(`select count(*) from
   information_schema.tables where table_schema = 'public'`)
  .then((data) => {
    if (data[0][0].count === '0') { // eslint-disable-line
      require('./reset.js'); // eslint-disable-line
    } else {
      require('./migrate.js'); // eslint-disable-line
    }
  })
  .catch((err) => {
    console.log(err); // eslint-disable-line
    process.exit(1); // eslint-disable-line
  });
} else {
  process.exit(0); // eslint-disable-line
}
