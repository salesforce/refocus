/**
 * ./db/createOrUpdateDb.js
 *
 * First check whether Database is present or not
 * If Database is present then check whethere table is present or not
 * If tables are present then performs migratedb otherwise resetdb to
 * create new tables and false migrations to keep migration table up to date
 * If database is not present then creates new database and performs resetdb
 */

const models = require('./index');
const conf = require('../config');
const pgtools = require('pgtools');
const utils = require('./utils');

// Heroku Private space postgres contains IP in host so check wthether
// it is IP or not, if it is IP then exit because it is not able to
// connect in Private space
if (utils.isInHerokuPrivateSpace()) {
  process.exit(0); // eslint-disable-line
}

models.sequelize.query(`select count(*) from
  information_schema.tables where table_schema = 'public'`)
.then((data) => {
  if (data[0][0].count === '0') { // eslint-disable-line
    require('./reset.js'); // eslint-disable-line
  } else {
    require('./migrate.js'); // eslint-disable-line
  }
})
.catch(() => {
  const dbConfig = utils.dbConfigObjectFromDbURL();
  pgtools.createdb(dbConfig, dbConfig.name, (err, res) => {
    if (err) {
      console.error('ERROR', err); // eslint-disable-line
      process.exit(1); // eslint-disable-line
    }

    console.log(`${res.command} "${dbConfig.name}"... OK`); // eslint-disable-line
    require('./reset.js'); // eslint-disable-line
  });
});
