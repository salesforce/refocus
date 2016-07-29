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
const env = conf.environment[conf.nodeEnv];
const DB_URL = env.dbUrl;

const dbConfig = {
  name: DB_URL.split('/').pop(),
  user: DB_URL.split(':')[1].slice(2), // eslint-disable-line
  password: DB_URL.split(':')[2].split('@')[0], // eslint-disable-line
  host: DB_URL.split('@').pop().split(':')[0], // eslint-disable-line
  port: DB_URL.split(':').pop().split('/')[0], // eslint-disable-line
};

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
  pgtools.createdb(dbConfig, dbConfig.name, (err, res) => {
    if (err) {
      console.error('ERROR', err); // eslint-disable-line
      process.exit(1); // eslint-disable-line
    }

    console.log(`${res.command} "${dbConfig.name}"... OK`); // eslint-disable-line
    require('./reset.js'); // eslint-disable-line
  });
});
