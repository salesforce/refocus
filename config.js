/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./config.js
 *
 * Configuration Settings
 */
'use strict'; // eslint-disable-line strict

const configUtil = require('./config/configUtil');
const defaultPort = 3000;
const defaultPostgresPort = 5432;
const pe = process.env; // eslint-disable-line no-process-env
const nodeEnv = pe.NODE_ENV || 'development';
const port = pe.PORT || defaultPort;
const defaultPayloadLimit = '200MB';
const disableHttp = pe.DISABLE_HTTP || false;
const newRelicKey = pe.NEW_RELIC_LICENSE_KEY || '';
const payloadLimit = pe.payloadLimit || defaultPayloadLimit;
const pgdatabase = pe.PGDATABASE || 'focusdb';
const pguser = pe.PGUSER || 'postgres';
const pgpass = pe.PGPASS || 'postgres';
const pghost = pe.PGHOST || 'localhost';
const pgport = pe.PGPORT || defaultPostgresPort;
const defaultDbUrl = 'postgres://' + pguser + ':' + pgpass + '@' + pghost +
  ':' + pgport + '/' + pgdatabase;

// By default, allow all IP's
const ipWhitelist = pe.IP_WHITELIST || '[[0.0.0.0,255.255.255.255]]';
const iplist = configUtil.parseIPlist(ipWhitelist);

// audit level values can be one of these: API, DB, ALL, NONE
const auditSubjects = pe.AUDIT_SUBJECTS || 'NONE';
const auditSamples = pe.AUDIT_SAMPLES || 'NONE';
const auditAspects = pe.AUDIT_ASPECTS || 'NONE';

module.exports = {

  api: {
    defaults: {
      limit: 10,
      offset: 10,
    },
    swagger: {
      doc: './api/v1/swagger.yaml',
      router: {
        controllers: './api/v1/controllers',
      },
      validator: {
        validateResponse: true,
      },
    },
    sessionSecret: 'refocusrockswithgreenowls',
  },
  redis: {
    channelName: 'focus',
  },
  db: {
    adminProfile: {
      name: 'Admin',
      aspectAccess: 'rw',
      lensAccess: 'rw',
      perspectiveAccess: 'rw',
      profileAccess: 'rw',
      sampleAccess: 'rw',
      subjectAccess: 'rw',
      userAccess: 'rw',
    },
    adminUser: {
      email: 'admin@refocus.admin',
      name: 'admin@refocus.admin',
      password: 'password',
    },
    modelDirName: 'model',
    passwordHashSaltNumRounds: 8,
  },

  // When adding new environment, consider adding it to /config/migrationConfig
  // as well to enable database migraton in the environment.
  environment: {
    build: {
      dbLogging: false, // console.log | false | ...
      dbUrl: defaultDbUrl,
      disableHttp,
      redisUrl: pe.REDIS_URL,
      defaultNodePort: defaultPort,
      host: '127.0.0.1',
      ipWhitelist: iplist.push('::ffff:127.0.0.1'),
      dialect: 'postgres',
      useAccessToken: pe.USE_ACCESS_TOKEN || false,
      tokenSecret:
       '7265666f637573726f636b7377697468677265656e6f776c7373616e6672616e',
    },
    development: {
      dbLogging: false, // console.log | false | ...
      dbUrl: defaultDbUrl,
      disableHttp,
      redisUrl: '//127.0.0.1:6379',
      defaultNodePort: defaultPort,
      host: '127.0.0.1',
      ipWhitelist: iplist,
      dialect: 'postgres',
      protocol: 'postgres',
      dialectOptions: {
        ssl: true,
      },
      useAccessToken: pe.USE_ACCESS_TOKEN || false,
      tokenSecret:
       '7265666f637573726f636b7377697468677265656e6f776c7373616e6672616e',
    },
    production: {
      dbLogging: false, // console.log | false | ...
      dbUrl: pe.DATABASE_URL,
      disableHttp,
      redisUrl: pe.REDIS_URL,
      ipWhitelist: iplist,
      dialect: 'postgres',
      protocol: 'postgres',
      dialectOptions: {
        ssl: true,
      },
      useAccessToken: pe.USE_ACCESS_TOKEN || false,
      tokenSecret: pe.SECRET_TOKEN ||
       '7265666f637573726f636b7377697468677265656e6f776c7373616e6672616e',
    },
    test: {
      dbLogging: false, // console.log | false | ...
      dbUrl: pe.DATABASE_URL,
      disableHttp,
      redisUrl: pe.REDIS_URL,
      defaultNodePort: defaultPort,
      ipWhitelist: iplist,
      dialect: 'postgres',
      protocol: 'postgres',
      dialectOptions: {
        ssl: true,
      },
      useAccessToken: pe.USE_ACCESS_TOKEN || false,
      tokenSecret: pe.SECRET_TOKEN ||
       '7265666f637573726f636b7377697468677265656e6f776c7373616e6672616e',
    },
    testDisableHttp: {
      dbLogging: false, // console.log | false | ...
      dbUrl: defaultDbUrl,
      disableHttp: true,
      redisUrl: '//127.0.0.1:6379',
      defaultNodePort: defaultPort,
      host: '127.0.0.1',
      useAccessToken: 'true',
      tokenSecret:
       '7265666f637573726f636b7377697468677265656e6f776c7373616e6672616e',
    },
    testWhitelistLocalhost: {
      dbLogging: false, // console.log | false | ...
      dbUrl: defaultDbUrl,
      disableHttp,
      redisUrl: pe.REDIS_URL,
      defaultNodePort: defaultPort,
      host: '127.0.0.1',
      ipWhitelist: iplist,
      tokenSecret:
       '7265666f637573726f636b7377697468677265656e6f776c7373616e6672616e',
    },
    testBlockAllhosts: {
      dbLogging: false, // console.log | false | ...
      dbUrl: defaultDbUrl,
      disableHttp,
      redisUrl: pe.REDIS_URL,
      defaultNodePort: defaultPort,
      host: '127.0.0.1',
      ipWhitelist: [''],
      tokenSecret:
       '7265666f637573726f636b7377697468677265656e6f776c7373616e6672616e',
    },
    testTokenReq: {
      dbLogging: false, // console.log | false | ...
      dbUrl: defaultDbUrl,
      disableHttp,
      redisUrl: '//127.0.0.1:6379',
      defaultNodePort: defaultPort,
      host: '127.0.0.1',
      useAccessToken: 'true',
      tokenSecret:
       '7265666f637573726f636b7377697468677265656e6f776c7373616e6672616e',
    },
    testTokenNotReq: {
      dbLogging: false, // console.log | false | ...
      dbUrl: defaultDbUrl,
      disableHttp,
      redisUrl: '//127.0.0.1:6379',
      defaultNodePort: defaultPort,
      host: '127.0.0.1',
      useAccessToken: false,
      tokenSecret:
       '7265666f637573726f636b7377697468677265656e6f776c7373616e6672616e',
    },

  },

  nodeEnv,
  port,
  payloadLimit,
  newRelicKey,
  auditSubjects,
  auditSamples,
  auditAspects,

};
