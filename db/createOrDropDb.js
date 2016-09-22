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
const conf = require('../config');
const env = conf.environment[conf.nodeEnv];
const DB_URL = env.dbUrl;

// example DB_URL: 'postgres://username:password@host:port/name'
const dbConfig = {
  name: DB_URL.split('/').pop(),
  user: DB_URL.split(':')[1].slice(2),
  password: DB_URL.split(':')[2].split('@')[0],
  host: DB_URL.split('@').pop().split(':')[0],
  port: DB_URL.split(':').pop().split('/')[0],
};

/**
 * Creates or drops db
 * @param {boolean} bool - If true, creates the db with dbConfig properties.
 * Bool defaults to false, to delete the configured db.
 * @param {Object} pgtool - Npm module for creating and dropping db.
 * @parm {Object} dbConfigObj - Js Object with db config, as input to pgtool.
*/
function createOrDropDb(bool, pgtool, dbConfigObj) {
  (bool ? pgtool.createdb : pgtool.dropdb)(
  dbConfigObj,
  dbConfigObj.name,
  (err, res) => {
    if (err) {
      console.error('ERROR', err.name); // eslint-disable-line
      process.exit(1); // eslint-disable-line
    }

    console.log(`${res.command} "${dbConfigObj.name}"... OK`); // eslint-disable-line
    process.exit(0); // eslint-disable-line
  });
}

const cli = commandLineArgs([
  { name: 'init', alias: 'i', type: Boolean },
  { name: 'drop', alias: 'd', type: Boolean },
]);

const options = cli.parse();
const keys = Object.keys(options);

if (keys.indexOf('init') >= 0) {
  createOrDropDb(true, pgtools, dbConfig);
} else if (keys.indexOf('drop') >= 0) {
  createOrDropDb(false, pgtools, dbConfig);
}


