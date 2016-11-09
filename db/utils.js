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
const url = require('url');
const conf = require('../config');
const env = conf.environment[conf.nodeEnv];
const DB_URL = env.dbUrl;

const ExitCodes = {
  OK: 0,
  ERROR: 1,
};

/**
 * Create a dbconfig object from the DB URL.
 *
 * @returns {Object} - dbconfig
 */
function dbConfigObjectFromDbURL() {
  const u = url.parse(DB_URL);
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
 * Initialize Admin User and Profile.
 *
 * @param {Object} seq - Sequelize
 * @returns {Promise}
 */
function initializeAdminUserAndProfile(seq) {
  var pid;
  return seq.models.Profile.upsert(conf.db.adminProfile)
  .then(() => {
    return seq.models.Profile.findOne({
      where: {
        name: {
          $iLike: conf.db.adminProfile.name,
        },
      },
    });
  })
  .then((profile) => {
    pid = profile.id;
    return seq.models.User.findOne({
      where: {
        name: {
          $iLike: conf.db.adminUser.name,
        },
      },
    });
  })
  .then((u) => {
    if (u) {
      return u;
    }

    conf.db.adminUser.profileId = pid;
    return seq.models.User.create(conf.db.adminUser);
  });
} // initializeAdminUserAndProfile

/**
 * A console logging wrapper for stuff running from the command line.
 *
 * @param {String} moduleName - The name of the module emitting the message.
 * @param {String} functionName - The name of the function emitting the
 *  message. (Undefined/empty/null is OK here if it's a module-level call.)
 * @param {String} msg - The message to log.
 */
function clog(moduleName, functionName, msg) {
  console.log('[./db/' + // eslint-disable-line no-console
    `${moduleName}${functionName ? '.' + functionName : ''}]`,
    msg);
} // clog

module.exports = {
  clog,
  dbConfigObjectFromDbURL,
  ExitCodes,
  initializeAdminUserAndProfile,
};
