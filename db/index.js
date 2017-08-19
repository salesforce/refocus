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
const u = require('./utils');

u.doImport();
u.seq.sync(false);
u.initializeAdminUserAndProfile();
const db = u.seq.models;
db.sequelize = u.seq;
db.Sequelize = u.Sequelize;
module.exports = db;
