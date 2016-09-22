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
 * Provides utility functions to parse the DB URL and to determine
 * whether or not the db is in a Heroku Private Space.
 *
 */
const url = require('url');
const conf = require('../config');
const env = conf.environment[conf.nodeEnv];
const DB_URL = env.dbUrl;

// create dbconfig object from DB URL
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

// check whether host is in private space of heroku or not
function isInHerokuPrivateSpace() {
  const rx = /^(?!0)(?!.*\.$)((1?\d?\d|25[0-5]|2[0-4]\d)(\.|$)){4}$/;
  const dbConfig = dbConfigObjectFromDbURL();
  console.log('dbConfig', dbConfig)
  return rx.test(dbConfig.host);
} // isInHerokuPrivateSpace

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

module.exports = {
  dbConfigObjectFromDbURL,
  initializeAdminUserAndProfile,
  isInHerokuPrivateSpace,
};
