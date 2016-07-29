/**
 * /config/migrationConfig
 * Migration config parameters
 */
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
