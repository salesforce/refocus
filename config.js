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
const featureToggles = require('feature-toggles');
const configUtil = require('./config/configUtil');
const defaultPort = 3000;
const defaultPostgresPort = 5432;
const pe = process.env; // eslint-disable-line no-process-env
const nodeEnv = pe.NODE_ENV || 'development';
const port = pe.PORT || defaultPort;
const defaultPayloadLimit = '200MB';
const payloadLimit = pe.REQUEST_PAYLOAD_LIMIT || defaultPayloadLimit;
const pgdatabase = pe.PGDATABASE || 'focusdb';
const pguser = pe.PGUSER || 'postgres';
const pgpass = pe.PGPASS || 'postgres';
const pghost = pe.PGHOST || 'localhost';
const pgport = pe.PGPORT || defaultPostgresPort;
const defaultDbUrl = 'postgres://' + pguser + ':' + pgpass + '@' + pghost +
  ':' + pgport + '/' + pgdatabase;
const DEFAULT_LOCAL_REDIS_URL = '//127.0.0.1:6379';
const DEFAULT_DB_CONNECTION_POOL = { // sequelize defaults
  max: 5,
  min: 0,
  idle: 10000,
};
const hiddenRoutes = pe.HIDDEN_ROUTES ?
  pe.HIDDEN_ROUTES.split[','] : ['/rooms']; // Routes to hide
const DEFAULT_BULK_UPSERT_JOB_CONCURRENCY = 1;

// By default, allow all IP's
const ipWhitelist = pe.IP_WHITELIST || '[[0.0.0.0,255.255.255.255]]';
const iplist = configUtil.parseIPlist(ipWhitelist);

// Check for timed-out samples every 30 seconds if not specified in env var
const DEFAULT_CHECK_TIMEOUT_INTERVAL_MILLIS = 30000;

// Expiry time used for redis cache
const CACHE_EXPIRY_IN_SECS = 60;

// request limiter settings
const rateLimit = pe.DDOS_RATE_LIMIT;
const rateWindow = pe.DDOS_RATE_WINDOW;
const endpointToLimit = pe.DDOS_ENDPOINT_TO_LIMIT;
const httpMethodToLimit = pe.DDOS_HTTP_METHOD_TO_LIMIT;

const DEFAULT_PERSIST_REDIS_SAMPLE_STORE_MILLISECONDS = 120000; // 2min

/*
 * name of the environment variable containing the read-only
 * database names as CSV
 */
const replicaConfigLabel = 'REPLICAS';

// an array of read-only data base URLs
const readReplicas = configUtil.getReadReplicas(pe, replicaConfigLabel);

const DEFAULT_JOB_QUEUE_TTL_SECONDS = 3600;

// default set to 30 minutes
const DEFAULT_JOB_REMOVAL_DELAY_SECONDS = 1800;

const JOB_REMOVAL_DELAY_SECONDS = pe.KUE_JOBS_REMOVAL_DELAY ||
  DEFAULT_JOB_REMOVAL_DELAY_SECONDS;

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

// set time interval for enableQueueStatsActivityLogs
const queueStatsActivityLogsInterval = 60000;

/*
 * Assigns each of the different redis uses cases to a particular redis
 * instance, if configured, or falls back to the primary redis instance.
 */
const redisUrls = {
  cache: pe.REDIS_CACHE && pe[pe.REDIS_CACHE] ?
    pe[pe.REDIS_CACHE] : (pe.REDIS_URL || DEFAULT_LOCAL_REDIS_URL),
  limiter: pe.REDIS_LIMITER && pe[pe.REDIS_LIMITER] ?
    pe[pe.REDIS_LIMITER] : (pe.REDIS_URL || DEFAULT_LOCAL_REDIS_URL),
  pubsub: pe.REDIS_PUBSUB && pe[pe.REDIS_PUBSUB] ?
    pe[pe.REDIS_PUBSUB] : (pe.REDIS_URL || DEFAULT_LOCAL_REDIS_URL),
  queue: pe.REDIS_QUEUE && pe[pe.REDIS_QUEUE] ?
    pe[pe.REDIS_QUEUE] : (pe.REDIS_URL || DEFAULT_LOCAL_REDIS_URL),
  realtimeLogging: pe.REDIS_REALTIME_LOGGING && pe[pe.REDIS_REALTIME_LOGGING] ?
    pe[pe.REDIS_REALTIME_LOGGING] : (pe.REDIS_URL || DEFAULT_LOCAL_REDIS_URL),
  sampleStore: pe.REDIS_SAMPLE_STORE && pe[pe.REDIS_SAMPLE_STORE] ?
    pe[pe.REDIS_SAMPLE_STORE] : (pe.REDIS_URL || DEFAULT_LOCAL_REDIS_URL),
  session: pe.REDIS_SESSION && pe[pe.REDIS_SESSION] ?
    pe[pe.REDIS_SESSION] : (pe.REDIS_URL || DEFAULT_LOCAL_REDIS_URL),
};

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
    connectionPool: {
      max: pe.DB_CONNECTION_POOL_MAX || DEFAULT_DB_CONNECTION_POOL.max,
      min: pe.DB_CONNECTION_POOL_MIN || DEFAULT_DB_CONNECTION_POOL.min,
      idle: pe.DB_CONNECTION_POOL_IDLE || DEFAULT_DB_CONNECTION_POOL.idle,
    },
    modelDirName: 'model',
    passwordHashSaltNumRounds: 8,
  },
  redis: {
    channelName: 'focus',
    instanceUrl: {
      cache: redisUrls.cache,
      limiter: redisUrls.limiter,
      pubsub: redisUrls.pubsub,
      queue: redisUrls.queue,
      realtimeLogging: redisUrls.realtimeLogging,
      sampleStore: redisUrls.sampleStore,
      session: redisUrls.session,
    },
  },

  // When adding new environment, consider adding it to /config/migrationConfig
  // as well to enable database migraton in the environment.
  environment: {
    build: {
      dbLogging: false, // console.log | false | ...
      dbUrl: defaultDbUrl,
      defaultNodePort: defaultPort,
      host: '127.0.0.1',
      ipWhitelist: iplist.push('::ffff:127.0.0.1'),
      dialect: 'postgres',
      tokenSecret:
       '7265666f637573726f636b7377697468677265656e6f776c7373616e6672616e',
    },
    development: {
      dbLogging: false, // console.log | false | ...
      dbUrl: defaultDbUrl,
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
      dbLogging: false, // console.log | false | ...
      dbUrl: pe.DATABASE_URL,
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
      dbLogging: false, // console.log | false | ...
      dbUrl: defaultDbUrl,
      defaultNodePort: defaultPort,
      host: '127.0.0.1',
      ipWhitelist: iplist,
      tokenSecret:
       '7265666f637573726f636b7377697468677265656e6f776c7373616e6672616e',
    },
    testBlockAllhosts: {
      dbLogging: false, // console.log | false | ...
      dbUrl: defaultDbUrl,
      defaultNodePort: defaultPort,
      host: '127.0.0.1',
      ipWhitelist: [''],
      tokenSecret:
       '7265666f637573726f636b7377697468677265656e6f776c7373616e6672616e',
    },
  },

  bulkUpsertSampleJobConcurrency: pe.BULK_UPSERT_JOB_CONCURRENCY ||
    DEFAULT_BULK_UPSERT_JOB_CONCURRENCY,
  checkTimeoutIntervalMillis: pe.CHECK_TIMEOUT_INTERVAL_MILLIS ||
    DEFAULT_CHECK_TIMEOUT_INTERVAL_MILLIS,
  CACHE_EXPIRY_IN_SECS,
  JOB_QUEUE_TTL_SECONDS,
  JOB_REMOVAL_DELAY_SECONDS,
  deprioritizeJobsFrom,
  endpointToLimit,
  httpMethodToLimit,
  kueStatsInactiveWarning: pe.KUESTATS_INACTIVE_WARNING,
  nodeEnv,
  payloadLimit,
  persistRedisSampleStoreMilliseconds:
    pe.PERSIST_REDIS_SAMPLE_STORE_MILLISECONDS ||
    DEFAULT_PERSIST_REDIS_SAMPLE_STORE_MILLISECONDS,
  port,
  prioritizeJobsFrom,
  queueStatsActivityLogsInterval,
  queueTime95thMillis: pe.QUEUESTATS_95TH_WARNING_MILLIS,
  rateLimit,
  rateWindow,
  readReplicas,
  hiddenRoutes,
};
