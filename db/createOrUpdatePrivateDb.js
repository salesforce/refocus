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
 * If Refocus is deployed in a heroku private space, check whether our tables
 * exist. If yes, run any necessary migrations, otherwize do a full reset to
 * create all the tables and insert pseudo-migrations to bring the migration
 * table up to date.\
 */
const models = require('./index');
const utils = require('./utils');

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
