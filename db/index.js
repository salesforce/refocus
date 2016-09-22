/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/index.js
 *
 * Database Model Loader
 */
'use strict'; // eslint-disable-line strict

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
require('sequelize-hierarchy')(Sequelize);
const conf = require('../config');
const dbutils = require('./utils');

const env = conf.environment[conf.nodeEnv];
const LAST_THREE_CHARS = -3;
const seq = new Sequelize(env.dbUrl, {
  logging: env.dbLogging,
});

/**
 * Tests whether the file is a javascript file.
 *
 * @param {Object} file - The file to test.
 * @returns {Boolean} True if file is a file (not a directory) and its name
 *  ends with .js.
 */
function isJavascriptFile(file) {
  return fs.statSync(file).isFile() && // eslint-disable-line no-sync
    file.slice(LAST_THREE_CHARS) === '.js';
}

/**
 * Imports all of the the model definitions from the db/model directory then
 * executes any designated post-import tasks (like setting up associations and
 * scopes, which depend on the existence of other models).
 * Initializes the "Admin" User and Profile.
 *
 * @param {String} modelDirName - The directory where the model definitions
 *  are located.
 * @returns {Object} Object containing each of the models.
 */
function doImport(modelDirName) {
  const dir = path.join(__dirname, modelDirName);
  const imported = {};
  const filteredFileArray = fs.readdirSync(dir) // eslint-disable-line no-sync
  .map((f) => path.join(dir, f))
  .filter((f) => isJavascriptFile(f));
  for (let i = 0; i < filteredFileArray.length; i++) {
    const m = seq.import(filteredFileArray[i]);
    imported[m.name] = m;
  }

  const keys = Object.keys(imported);
  for (let i = 0; i < keys.length; i++) {
    const m = keys[i];
    if (imported[m].postImport) {
      imported[m].postImport(imported);
    }
  }

  dbutils.initializeAdminUserAndProfile(seq);
  return imported;
}

/*
 * Set up the "db" object and prepare it to be exported. It will contain the
 * imported models, the "reset" function, the "sequelize" instance and the
 * Sequelize class.
 */
const db = doImport(conf.db.modelDirName);
db.sequelize = seq;
db.Sequelize = Sequelize;

module.exports = db;
