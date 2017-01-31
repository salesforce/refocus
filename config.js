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
require('./config/toggles'); // Loads the feature toggles
const configUtil = require('./config/configUtil');
const defaultPort = 3000;
const defaultPostgresPort = 5432;
const pe = process.env; // eslint-disable-line no-process-env
const nodeEnv = pe.NODE_ENV || 'development';
const port = pe.PORT || defaultPort;
const defaultPayloadLimit = '200MB';
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

// Check for timed-out samples every 30 seconds if not specified in env var
const DEFAULT_CHECK_TIMEOUT_INTERVAL_MILLIS = 30000;

// audit level values can be one of these: API, DB, ALL, NONE
const auditSubjects = pe.AUDIT_SUBJECTS || 'NONE';
const auditSamples = pe.AUDIT_SAMPLES || 'NONE';
const auditAspects = pe.AUDIT_ASPECTS || 'NONE';

// Expiry time used for redis cache
const CACHE_EXPIRY_IN_SECS = 60;

// request limiter settings
const rateLimit = pe.RATE_LIMIT;
const rateWindow = pe.RATE_WINDOW;
const endpointToLimit = pe.ENDPOINT_TO_LIMIT;
const httpMethodToLimit = pe.HTTP_METHOD_TO_LIMIT;

const DEFAULT_JOB_QUEUE_TTL_SECONDS = 3600;

/*
 * If you're using worker dynos, you can set env vars PRIORITIZE_JOBS_FROM
 * and/or DEPRIORITIZE_JOBS_FROM to comma-separated lists of ip addresses if
 * you want to prioritize or deprioritize jobs from a particular user ip
 * address (or multiple users' ip addresses). Has no effect if you're not
 * using worker dynos.
 */
const prioritizeJobsFrom = configUtil.csvToArray(pe.PRIORITIZE_JOBS_FROM);
const deprioritizeJobsFrom = configUtil.csvToArray(pe.DEPRIORITIZE_JOBS_FROM);

// set time to live for "kue" jobs
const JOB_QUEUE_TTL_SECONDS = pe.TTL_KUE_JOBS || DEFAULT_JOB_QUEUE_TTL_SECONDS;

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
      checkTimeoutIntervalMillis: pe.CHECK_TIMEOUT_INTERVAL_MILLIS ||
        DEFAULT_CHECK_TIMEOUT_INTERVAL_MILLIS,
      dbLogging: false, // console.log | false | ...
      dbUrl: defaultDbUrl,
      redisUrl: pe.REDIS_URL,
      defaultNodePort: defaultPort,
      host: '127.0.0.1',
      ipWhitelist: iplist.push('::ffff:127.0.0.1'),
      dialect: 'postgres',
      tokenSecret:
       '7265666f637573726f636b7377697468677265656e6f776c7373616e6672616e',
    },
    development: {
      checkTimeoutIntervalMillis: pe.CHECK_TIMEOUT_INTERVAL_MILLIS ||
        DEFAULT_CHECK_TIMEOUT_INTERVAL_MILLIS,
      dbLogging: false, // console.log | false | ...
      dbUrl: defaultDbUrl,
      redisUrl: '//127.0.0.1:6379',
      defaultNodePort: defaultPort,
      host: '127.0.0.1',
      ipWhitelist: iplist,
      dialect: 'postgres',
      protocol: 'postgres',
      dialectOptions: {
        ssl: true,
      },
      tokenSecret:
       '7265666f637573726f636b7377697468677265656e6f776c7373616e6672616e',
    },
    production: {
      checkTimeoutIntervalMillis: pe.CHECK_TIMEOUT_INTERVAL_MILLIS ||
        DEFAULT_CHECK_TIMEOUT_INTERVAL_MILLIS,
      dbLogging: false, // console.log | false | ...
      dbUrl: pe.DATABASE_URL,
      redisUrl: pe.REDIS_URL,
      ipWhitelist: iplist,
      dialect: 'postgres',
      protocol: 'postgres',
      dialectOptions: {
        ssl: true,
      },
      tokenSecret: pe.SECRET_TOKEN ||
       '7265666f637573726f636b7377697468677265656e6f776c7373616e6672616e',
    },
    testWhitelistLocalhost: {
      checkTimeoutIntervalMillis: pe.CHECK_TIMEOUT_INTERVAL_MILLIS ||
        DEFAULT_CHECK_TIMEOUT_INTERVAL_MILLIS,
      dbLogging: false, // console.log | false | ...
      dbUrl: defaultDbUrl,
      redisUrl: pe.REDIS_URL,
      defaultNodePort: defaultPort,
      host: '127.0.0.1',
      ipWhitelist: iplist,
      tokenSecret:
       '7265666f637573726f636b7377697468677265656e6f776c7373616e6672616e',
    },
    testBlockAllhosts: {
      checkTimeoutIntervalMillis: pe.CHECK_TIMEOUT_INTERVAL_MILLIS ||
        DEFAULT_CHECK_TIMEOUT_INTERVAL_MILLIS,
      dbLogging: false, // console.log | false | ...
      dbUrl: defaultDbUrl,
      redisUrl: pe.REDIS_URL,
      defaultNodePort: defaultPort,
      host: '127.0.0.1',
      ipWhitelist: [''],
      tokenSecret:
       '7265666f637573726f636b7377697468677265656e6f776c7373616e6672616e',
    },
  },

  nodeEnv,
  port,
  payloadLimit,
  auditSubjects,
  auditSamples,
  auditAspects,
  CACHE_EXPIRY_IN_SECS,
  JOB_QUEUE_TTL_SECONDS,
  rateLimit,
  rateWindow,
  endpointToLimit,
  httpMethodToLimit,
  prioritizeJobsFrom,
  deprioritizeJobsFrom,
};
