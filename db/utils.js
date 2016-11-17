/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./db/utils.js
 *
 * Provides utility functions to parse the DB URL and initialize the admin
 * user and profile.
 */
'use strict'; // eslint-disable-line strict
const fs = require('fs');
const path = require('path');
const url = require('url');
const Sequelize = require('sequelize');
require('sequelize-hierarchy')(Sequelize);
const conf = require('../config');
const env = conf.environment[conf.nodeEnv];
const seq = new Sequelize(env.dbUrl, {
  logging: env.dbLogging,
});
const DB_URL = env.dbUrl;
const SQL_DROP_SEQUELIZE_META = 'DROP TABLE IF EXISTS public."SequelizeMeta"';
const SQL_INSERT_SEQUELIZE_META = 'INSERT INTO "SequelizeMeta"(name) VALUES';
const SQL_CREATE_SEQUELIZE_META = 'CREATE TABLE public."SequelizeMeta" ' +
  '(name character varying(255) NOT NULL, CONSTRAINT "SequelizeMeta_pkey" ' +
  'PRIMARY KEY (name)) WITH (OIDS=FALSE)';
const ExitCodes = {
  OK: 0,
  ERROR: -1,
};

/**
 * Create a dbconfig object from the DB URL.
 *
 * @param {String} dbUrl - The DB URL. Leave empty to use the one from env.
 * @returns {Object} - dbconfig
 */
function dbConfigObjectFromDbURL(dbUrl) {
  const u = url.parse(dbUrl || DB_URL);
  const auth = u.auth.split(':');
  return {
    name: u.pathname.slice(1), // strip off leading slash
    user: auth[0],
    password: auth[1],
    host: u.hostname,
    port: u.port,
  };
} // dbConfigObjectFromDbURL

/**
 * A console logging wrapper for stuff running from the command line.
 *
 * @param {String} moduleName - The name of the module emitting the message.
 * @param {String} functionName - The name of the function emitting the
 *  message. (Undefined/empty/null is OK here if it's a module-level call.)
 * @param {String} msg - The message to log.
 */
function clog(moduleName, functionName, msg) {
  if (conf.nodeEnv === 'development') {
    console.log('[./db/' + // eslint-disable-line no-console
      `${moduleName}${functionName ? '.' + functionName : ''}]`,
      msg);
  }
} // clog

/**
 * Create or drop the database.
 *
 * @param {Function} cmd - The pgtools function to create the db.
 * @returns {Promise} - Resolves to success message or throws error.
 */
function createOrDropDb(cmd) {
  const dbConfig = dbConfigObjectFromDbURL();
  return cmd(dbConfig, dbConfig.name)
  .then((res) => `${res.command} "${dbConfig.name}"... OK`)
  .catch((err) => {
    throw new Error(
      `${err.pgErr.routine} "${dbConfig.name}"... FAILED (${err.name})`);
  });
} // createOrDropDb

/**
 * Initialize Admin User and Profile.
 *
 * @returns {Promise}
 */
function initializeAdminUserAndProfile() {
  const profileFinder = {
    where: { name: { $iLike: conf.db.adminProfile.name } },
  };
  const userFinder = {
    where: {
      name: {
        $iLike: conf.db.adminUser.name,
      },
    },
  };
  let pid;
  return seq.models.Profile.upsert(conf.db.adminProfile)
  .then(() => seq.models.Profile.findOne(profileFinder))
  .then((profile) => {
    pid = profile.id;
    return seq.models.User.findOne(userFinder);
  })
  .then((u) => {
    if (u) {
      return u;
    }

    conf.db.adminUser.profileId = pid;
    return seq.models.User.create(conf.db.adminUser);
  })
  .then(() => 'Initialize Admin User and Profile... OK');
} // initializeAdminUserAndProfile

/**
 * Fetch the migrations from migration directory. Perform pseudo-migrations to
 * bring the SequelizeMeta migrations up to date.
 *
 * @returns {Promise} - Resolves to on OK message on completion or rejects.
 */
function setMigrations() {
  const migrationPath = path.resolve('migrations');
  return new seq.Promise((resolve, reject) => {
    fs.readdir(migrationPath, (err, items) => {
      if (err) {
        reject(err);
      }

      const values = items
      .filter((item) => item.endsWith('.js'))
      .map((item) => ` ('${item}\')`);
      if (!values) {
        resolve('No migration records to insert into SequelizeMeta.');
      }

      const q = SQL_INSERT_SEQUELIZE_META + values.join();
      resolve(seq.query(q).then(() =>
        `Insert ${values.length} migration records into SequelizeMeta... OK`));
    });
  });
} // setMigrations

/**
 * Tests whether the file is a javascript file.
 *
 * @param {Object} file - The file to test.
 * @returns {Boolean} True if file is a file (not a directory) and its name
 *  ends with .js.
 */
function isJavascriptFile(file) {
  return fs.statSync(file).isFile() && // eslint-disable-line no-sync
    file.endsWith('.js');
} // isJavascriptFile

/**
 * Imports all of the the model definitions from the db/model directory then
 * executes any designated post-import tasks (like setting up associations and
 * scopes, which depend on the existence of other models).
 * Initializes the "Admin" User and Profile.
 *
 * @param {String} modelDirName - The directory where the model definitions
 *  are located.
 * @returns {Promise} Resolves to object containing all the models.
 */
function doImport() {
  const dir = path.join(__dirname, conf.db.modelDirName);
  fs.readdirSync(dir) // eslint-disable-line no-sync
  .map((f) => path.join(dir, f))
  .filter(isJavascriptFile)
  .forEach((f) => seq.import(f));

  if (seq.models) {
    const modelNames = Object.keys(seq.models);
    clog('utils', 'doImport', `Import ${modelNames.length} models... OK`);
    const promises = modelNames.filter((m) => seq.models[m].postImport)
      .map((m) => seq.models[m].postImport(seq.models));
    return seq.Promise.all(promises)
    .then(() => {
      clog('utils', 'doImport', 'Post-import... OK');
      return 'Import complete... OK';
    });
  }

  return new seq.Promise((resolve) => {
    resolve('No models found');
  });
} // doImport

/**
 * Imports, syncs and initializes.
 *
 * @param {Boolean} force - Default false; if true, truncates tables first.
 * @returns {Promise} - Resolves OK or rejects.
 */
function importSyncInitialize(force) {
  return doImport()
  .then((res) => {
    clog('utils', 'importSyncInitialize', res);
    return seq.sync({ force });
  })
  .then(() => {
    clog('utils', 'importSyncInitialize', `Sync (force=${force})... OK`);
    return initializeAdminUserAndProfile();
  })
  .then((res) => {
    clog('utils', 'importSyncInitialize', res);
    const db = seq.models;
    db.sequelize = seq;
    db.Sequelize = Sequelize;
    return db;
  });
} // importSyncInitialize

/**
 * Resets the db as it is defined in db/index.js and brings the SequelizeMeta
 * migrations up to date.
 *
 * @returns {Promise} resolves OK or throws error.
 */
function reset() {
  return importSyncInitialize(true)
  .then(() => seq.query(SQL_DROP_SEQUELIZE_META))
  .then(() => seq.query(SQL_CREATE_SEQUELIZE_META))
  .then(() => setMigrations(seq))
  .then((res) => {
    clog('utils', 'reset', res);
    return 'OK';
  });
} // reset

// Polyfill Array "includes" -- https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/includes
if (!Array.prototype.includes) {
  Array.prototype.includes = function (searchElement /*, fromIndex*/) {
    'use strict';
    if (this == null) {
      throw new TypeError('Array.prototype.includes called on null or undefined');
    }

    var O = Object(this);
    var len = parseInt(O.length, 10) || 0;
    if (len === 0) {
      return false;
    }

    var n = parseInt(arguments[1], 10) || 0;
    var k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) {k = 0;}
    }

    var currentElement;
    while (k < len) {
      currentElement = O[k];
      if (searchElement === currentElement ||
         (searchElement !== searchElement && currentElement !== currentElement)) { // NaN !== NaN
        return true;
      }

      k++;
    }

    return false;
  };
}

module.exports = {
  clog,
  createOrDropDb,
  dbConfigObjectFromDbURL,
  doImport,
  importSyncInitialize,
  initializeAdminUserAndProfile,
  ExitCodes,
  reset,
  seq,
  Sequelize,
};
