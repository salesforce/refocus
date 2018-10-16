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
const redisConfig = require('./config/redisConfig');
const collectorConfig = require('./config/collectorConfig');
const ms = require('ms');
const defaultPort = 3000;
const defaultPostgresPort = 5432;
const pe = process.env; // eslint-disable-line no-process-env
const nodeEnv = pe.NODE_ENV || 'development';
const port = pe.PORT || defaultPort;
const defaultPayloadLimit = '200MB';
const payloadLimit = pe.REQUEST_PAYLOAD_LIMIT || defaultPayloadLimit;
const newRelicKey = pe.NEW_RELIC_LICENSE_KEY || '';
const pgdatabase = pe.PGDATABASE || 'focusdb';
const pguser = pe.PGUSER || 'postgres';
const pgpass = pe.PGPASS || 'postgres';
const pghost = pe.PGHOST || 'localhost';
const pgport = pe.PGPORT || defaultPostgresPort;
const defaultDbUrl = 'postgres://' + pguser + ':' + pgpass + '@' + pghost +
  ':' + pgport + '/' + pgdatabase;
const DEFAULT_DB_CONNECTION_POOL = { // sequelize defaults
  max: 5,
  min: 0,
  idle: 10000,
};
const hiddenRoutes = pe.HIDDEN_ROUTES ?
  pe.HIDDEN_ROUTES.split(',') : ['']; // Routes to hide
const corsRoutes = pe.CORS_ROUTES ?
  pe.CORS_ROUTES.split(',') : ['']; // Routes to allow CORS

// By default, allow all IP's
const ipWhitelist = pe.IP_WHITELIST || '[[0.0.0.0,255.255.255.255]]';
const iplist = configUtil.parseIPlist(ipWhitelist);

// GET Samples Cache invalidation default time
const DEFAULT_GET_SAMPLES_WILDCARD_CACHE_INVALIDATION = 5;

// Expiry time used for redis cache
const DEFAULT_CACHE_EXPIRY_IN_SECS = 60;
const CACHE_EXPIRY_IN_SECS = pe.CACHE_EXPIRY_IN_SECS ||
  DEFAULT_CACHE_EXPIRY_IN_SECS;

// request limiter settings
const expressLimiterPath = configUtil.csvToArray(pe.EXPRESS_LIMITER_PATH);
const expressLimiterMethod = configUtil.csvToArray(pe.EXPRESS_LIMITER_METHOD);
const expressLimiterLookup =
  configUtil.csvToArray(pe.EXPRESS_LIMITER_LOOKUP || 'headers.UserName');
const expressLimiterTotal = pe.EXPRESS_LIMITER_TOTAL;
const expressLimiterExpire = pe.EXPRESS_LIMITER_EXPIRE;
const expressLimiterTotal2 = pe.EXPRESS_LIMITER_TOTAL_2;
const expressLimiterExpire2 = pe.EXPRESS_LIMITER_EXPIRE_2;

const botEventLimit = pe.BOT_EVENT_LIMIT || 100;

const minRoomDeactivationAge = +pe.MIN_ROOM_DEACTIVATION_AGE || 120; // 2 hours

/*
 * name of the environment variable containing the read-only
 * database names as CSV
 */
const replicaConfigLabel = 'REPLICAS';

// an array of read-only data base URLs
const readReplicas = configUtil.getReadReplicas(pe, replicaConfigLabel);

const DEFAULT_JOB_QUEUE_TTL_SECONDS_ASYNC = 3600;
const DEFAULT_JOB_QUEUE_TTL_SECONDS_SYNC = 25;

const DEFAULT_JOB_REMOVAL_DELAY_MINUTES = 30;
const JOB_REMOVAL_DELAY = 60 * 1000 * (pe.KUE_JOBS_REMOVAL_DELAY_MINUTES ||
  DEFAULT_JOB_REMOVAL_DELAY_MINUTES);

const DEFAULT_JOB_REMOVAL_BATCH_SIZE = 1000;
const JOB_REMOVAL_BATCH_SIZE = pe.KUE_JOBS_REMOVAL_BATCH_SIZE ||
  DEFAULT_JOB_REMOVAL_BATCH_SIZE;

/*
 * If you're using worker dynos, you can set env vars PRIORITIZE_JOBS_FROM
 * and/or DEPRIORITIZE_JOBS_FROM to comma-separated lists of user names, token
 * names or ip addresses if you want to prioritize or deprioritize jobs from
 * particular users and/or tokens and/or ip addresses. Has no effect if you're
 * not using worker dynos.
 */
const prioritizeJobsFrom = configUtil.csvToArray(pe.PRIORITIZE_JOBS_FROM);
const deprioritizeJobsFrom = configUtil.csvToArray(pe.DEPRIORITIZE_JOBS_FROM);

// set time to live for "kue" jobs
const JOB_QUEUE_TTL_SECONDS_ASYNC = pe.TTL_KUE_JOBS_ASYNC
  || DEFAULT_JOB_QUEUE_TTL_SECONDS_ASYNC;
const JOB_QUEUE_TTL_SECONDS_SYNC = pe.TTL_KUE_JOBS_SYNC
  || DEFAULT_JOB_QUEUE_TTL_SECONDS_SYNC;

// encryption/decryption algorithm used for securing the context variables when
// sent to collector.
const encryptionAlgoForCollector = 'aes-256-cbc';

const kueShutdownTimeout = +pe.KUE_SHUTDOWN_TIMEOUT || 5000;
const waitingSigKillTimeout = +pe.WAITING_SIG_KILL_TIMEOUT || 60000;

const jobType = {
  createAuditEvents: 'createAuditEvents',
  bulkUpsertSamples: 'bulkUpsertSamples',
  getHierarchy: 'getHierarchy',
  bulkDeleteSubjects: 'bulkDeleteSubjects',
};

const clockJobConfig = {
  intervals: {
    checkMissedCollectorHeartbeat: String(collectorConfig.heartbeatIntervalMillis),
    deactivateRooms: '5m',
    jobCleanup: '30m',
    kueStatsActivityLogs: '1m',
    pubStatsLogs: '1m',
    queueStatsActivityLogs: '1m',
    resetJobCounter: '24h',
    sampleTimeout: '30s',
  },
  useWorker: {
    checkMissedCollectorHeartbeat: true,
    jobCleanup: true,
    sampleTimeout: true,
  },
  toggles: {
    kueStatsActivityLogs: 'enableKueStatsActivityLogs',
    pubStatsLogs: 'enablePubStatsLogs',
    queueStatsActivityLogs: 'enableQueueStatsActivityLogs',
  },
};

// override job concurrency from env vars
const jobConcurrency = {};
Object.keys(jobType).forEach((jobName) => {
  const envValue = pe[`WORKER_JOB_CONCURRENCY:${jobName}`];
  jobConcurrency[jobName] = envValue || 1;
});

// override intervals from env vars and convert to ms
Object.keys(clockJobConfig.intervals).forEach((jobName) => {
  const defaultValue = clockJobConfig.intervals[jobName];
  const envValue = pe[`CLOCK_JOB_INTERVAL:${jobName}`];
  const value = envValue || defaultValue;
  clockJobConfig.intervals[jobName] = ms(value);
});

module.exports = {
  api: {
    defaults: {
      limit: +pe.GET_REQUEST_DEFAULT_LIMIT || 10000,
      offset: 0,
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
    sessionSecret: pe.SESSION_SECRET || 'refocusrockswithgreenowls',
  },
  db: {
    adminProfile: {
      name: 'Admin',
      aspectAccess: 'rw',
      botAccess: 'rw',
      eventAccess: 'rw',
      lensAccess: 'rw',
      perspectiveAccess: 'rw',
      profileAccess: 'rw',
      roomAccess: 'rw',
      roomTypeAccess: 'rw',
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
      acquire: null, // disable acquire timeout
    },
    modelDirName: 'model',
    passwordHashSaltNumRounds: 8,
  },
  redis: redisConfig,
  collector: collectorConfig,

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

  getSamplesWildcardCacheInvalidation:
    pe.GET_SAMPLES_WILDCARD_CACHE_INVALIDATION ||
    DEFAULT_GET_SAMPLES_WILDCARD_CACHE_INVALIDATION,
  CACHE_EXPIRY_IN_SECS,
  JOB_QUEUE_TTL_SECONDS_ASYNC,
  JOB_QUEUE_TTL_SECONDS_SYNC,
  JOB_REMOVAL_DELAY,
  JOB_REMOVAL_BATCH_SIZE,
  clockJobConfig,
  jobType,
  jobConcurrency,
  deprioritizeJobsFrom,
  expressLimiterPath,
  expressLimiterMethod,
  expressLimiterLookup,
  expressLimiterTotal,
  expressLimiterExpire,
  expressLimiterTotal2,
  expressLimiterExpire2,
  botEventLimit,
  logEnvVars: {
    MASK_LIST: pe.LOG_ENV_VARS_MASK_LIST ?
      pe.LOG_ENV_VARS_MASK_LIST.split(',') : [],
    MAX_LEN: +pe.LOG_ENV_VARS_MAX_LEN || 512,
  },
  minRoomDeactivationAge,
  kueStatsInactiveWarning: pe.KUESTATS_INACTIVE_WARNING,
  newRelicKey,
  nodeEnv,
  payloadLimit,
  port,
  prioritizeJobsFrom,
  queueTime95thMillis: pe.QUEUESTATS_95TH_WARNING_MILLIS,
  readReplicas,
  hiddenRoutes,
  corsRoutes,
  encryptionAlgoForCollector,
  kueShutdownTimeout,
  waitingSigKillTimeout,
};
