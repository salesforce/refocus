/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./db/reset.js
 *
 * Resets the db as it is defined in db/index.js  and brings the SequelizeMeta
 * migrations up to date.
 */
const models = require('./index');
const dbutils = require('./utils');
const fs = require('fs');
const path = require('path');

/**
 * Fetch the migrations from migration directory. Perform pseudo-migrations to
 * bring the SequelizeMeta migrations up to date.
 */
function setMigrations() {
  const migrationPath = path.resolve('migrations');
  fs.readdir(migrationPath, (err, items) => {
    if (err) {
      console.log(err.original); // eslint-disable-line
      process.exit(1); // eslint-disable-line
    }

    var query = 'Insert into "SequelizeMeta"(name) values';
    for (var i = 0; i < items.length; i++) {
      if (items[i].indexOf('.js') >= 0) { // eslint-disable-line
        query += ' (\'' + items[i] + '\'),';
      }
    }

    query = query.slice(0, -1); // eslint-disable-line
    models.sequelize.query(query)
    .then(() => {
      console.log('DB RESET'); // eslint-disable-line
      process.exit(0); // eslint-disable-line
    })
    .catch((error) => {
      console.log(error); // eslint-disable-line
      process.exit(1); // eslint-disable-line
    });
  });
}

module.exports = models.sequelize.sync({ force: true })
.then(() => {
  return dbutils.initializeAdminUserAndProfile(models.sequelize);
})
.then(() => {
  models.sequelize.query('DROP TABLE IF EXISTS public."SequelizeMeta"')
  .then(() => {
    models.sequelize.query(`CREATE TABLE public."SequelizeMeta"
      (name character varying(255) NOT NULL, CONSTRAINT "SequelizeMeta_pkey"
      PRIMARY KEY (name)) WITH (OIDS=FALSE)`)
    .then(() => {
      setMigrations();
    })
    .catch((error) => {
      console.log(error.original); // eslint-disable-line
      process.exit(1); // eslint-disable-line
    });
  })
  .catch((error) => {
    console.log(error.original); // eslint-disable-line
    process.exit(1); // eslint-disable-line
  });
})
.catch((error) => {
  console.log(error.original); // eslint-disable-line
  process.exit(1); // eslint-disable-line
});
