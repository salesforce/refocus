/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /config/migrationConfig
 * Migration config parameters
 */
'use strict'; // eslint-disable-line strict

const conf = require('../config');

module.exports = {
  development: {
    url: conf.environment.development.dbUrl,
    dialect: conf.environment.development.dialect,
  },
  production: {
    url: conf.environment.production.dbUrl,
    dialect: conf.environment.production.dialect,
  },
  build: {
    url: conf.environment.build.dbUrl,
    dialect: conf.environment.build.dialect,
  },
};
