/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /config/toggles.js
 *
 * Configure feature toggles.
 *
 * Usage: wherever you need to check whether a feature is enabled, just
 * add require('feature-toggles') to the top of the module then use
 * featureToggles.isFeatureEnabled('MY_FEATURE_NAME') or
 * featureToggles.isFeatureEnabled('MY_FEATURE_NAME', 'myarg', 'anotherarg').
 * (All the args after the feature name are passed to the function if the
 * feature is defined using a function.)
 */
'use strict'; // eslint-disable-line strict
const featureToggles = require('feature-toggles');
const pe = process.env; // eslint-disable-line no-process-env

/**
 * Return boolean true if the named environment variable is boolean true or
 * case-insensitive string 'true'.
 *
 * @param {Object} processEnv - The node process environment. (Passing it into
 *  this function instead of just getting a reference to it *inside* this
 *  function makes the function easier to test.)
 * @param {String} environmentVariableName - The name of the environment var.
 * @returns {Boolean} true if the named environment variable is boolean true or
 *  case-insensitive string 'true'.
 */
function environmentVariableTrue(processEnv, environmentVariableName) {
  const x = processEnv[environmentVariableName];
  return typeof x !== 'undefined' && x !== null &&
    x.toString().toLowerCase() === 'true';
} // environmentVariableTrue

/**
 * Return boolean false if the named environment variable is boolean false or
 * case-insensitive string 'false'.
 *
 * @param {Object} processEnv - The node process environment. (Passing it into
 *  this function instead of just getting a reference to it *inside* this
 *  function makes the function easier to test.)
 * @param {String} environmentVariableName - The name of the environment var.
 * @returns {Boolean} true if the named environment variable is boolean true or
 *  case-insensitive string 'true'.
 */
function environmentVariableFalse(processEnv, environmentVariableName) {
  const x = processEnv[environmentVariableName];
  return typeof x !== 'undefined' && x !== null &&
    x.toString().toLowerCase() === 'false';
} // environmentVariableFalse

/**
 * Return boolean true if the named environment variable contains a comma-
 * delimited list of strings and one of those strings matches the test string
 * (case-insensitive). If the env var === '*' then returns true for any test
 * string.
 *
 * @param {Object} env - The node process environment. (Passing it into
 *  this function instead of just getting a reference to it *inside* this
 *  function makes the function easier to test.)
 * @param {String} envVarName - The name of the environment var.
 * @param {String} str - The test string.
 * @returns {Boolean} true if the named environment variable is boolean true or
 *  case-insensitive string 'true'.
 */
function envVarIncludes(env, envVarName, str) {
  const val = env[envVarName];

  /* str length < 1? False! */
  if (str.length < 1) return false;

  /* Not defined or null? False! */
  if (typeof val === 'undefined' || !val) return false;

  /* Wildcard "all"? True! */
  if (val.toString() === '*') return true;

  /* Array includes str? (Strip any leading/trailing spaces first. */
  const arr = val.toString().toLowerCase().split(',').map((i) => i.trim());
  return arr.includes(str.toLowerCase());
} // envVarIncludes

/*
 * longTermToggles - add a new toggle here if you expect it to be around
 * long-term.
 *
 * Defining a toggle in either "shortTermToggles" or "longTermToggles" has no
 * bearing on how the toggle behaves--it is purely a way for us keep track of
 * our *intention* for a particular feature toggle. It should help us keep
 * things from getting out of hand and keeping tons of dead unused code around.
 */
const longTermToggles = {
  // Activity logging
  enableApiActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS', 'api'),
  enableCollectorAssignmentLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'collectorAssignment'),
  enableCollectorHeartbeatLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'collectorHeartbeat'),
  enableEnvActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS', 'env'),
  enableJobActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS', 'job'),
  enableJobCleanupActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'jobCleanup'),
  enableJobCreateActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'jobCreate'),
  enableKueStatsActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'kueStats'),
  enableLimiterActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'limiter'),
  enablePubsubStatsLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'pubsubStats'),
  enableQueueStatsActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'queueStats'),
  enableRealtimeActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'realtime'),
  enableSigtermActivityLog: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'sigterm'),
  enableUnauthorizedActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'unauthorized'),
  enableWorkerActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'worker'),
  enableEventActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'event'),

  // Enable heroku clock dyno
  enableClockProcess: environmentVariableTrue(pe, 'ENABLE_CLOCK_PROCESS'),

  // Hide routes
  hideRoutes: environmentVariableTrue(pe, 'HIDE_ROUTES'),

  /*
   * Use separate realtime application for perspectives if the env var exists and is not equal
   * to "/".
   */
  enableRealtimeApplication: pe.hasOwnProperty('REALTIME_APPLICATION')
    && pe.REALTIME_APPLICATION !== '/',

  /*
   * Use separate realtime application for Imc rooms if the env var exists and is not equal
   * to "/".
   */
  enableRealtimeApplicationImc: pe.hasOwnProperty('REALTIME_APPLICATION_IMC')
    && pe.REALTIME_APPLICATION_IMC !== '/',

  // Enable redis client connection logging.
  enableRedisConnectionLogging: environmentVariableTrue(pe,
    'ENABLE_REDIS_CONNECTION_LOGGING'),

  // Use redis sampleStore with postgres db backup.
  enableRedisSampleStore:
    environmentVariableTrue(pe, 'ENABLE_REDIS_SAMPLE_STORE'),

  // Enable sample store info logging
  enableSampleStoreInfoLogging: environmentVariableTrue(pe,
    'ENABLE_SAMPLE_STORE_INFO_LOGGING'),

  /*
   * Use this setting to offload work from web processes to worker processes to
   * achieve better web process throughput and response times.
   */
  enableWorkerProcess: environmentVariableTrue(pe, 'ENABLE_WORKER_PROCESS'),

  // Reject local user registration
  rejectLocalUserRegistration:
    environmentVariableTrue(pe, 'REJECT_LOCAL_USER_REGISTRATION'),

  // Reject (401) requests with multiple X-Forwarded-For values
  rejectMultipleXForwardedFor:
    environmentVariableTrue(pe, 'REJECT_MULTIPLE_X_FORWARDED_FOR'),

  // Disable HTTP, i.e. only use https
  requireHttps: environmentVariableTrue(pe, 'REQUIRE_HTTPS'),

  // Toggle to redirect to different instance of refocus
  enableRedirectDifferentInstance: environmentVariableTrue(pe,
    'ENABLE_REDIRECT_DIFFERENT_INSTANCE'),

  // Toggle to turn on Kafka Logging
  kafkaLogging: environmentVariableTrue(pe, 'KAFKA_LOGGING'),

  // Toggle to turn on LocalLogging
  localLogging: !environmentVariableFalse(pe, 'LOCAL_LOGGING'),

}; // longTermToggles

/*
 * shortTermToggles - add a new toggle here if you expect it to just be a
 * short-term thing, i.e. we'll use it to control rollout of a new feature, but
 * once we're satisfied with the new feature, we'll pull it out and clean up
 * after ourselves.
 *
 * Defining a toggle in either shortTermToggles or longTermToggles has no
 * bearing on how the toggle behaves--it is purely a way for us keep track of
 * our *intention* for a particular feature toggle. It should help us keep
 * things from getting out of hand and keeping tons of dead unused code around.
 */
const shortTermToggles = {

  // turn on logging to log invalid hmset values
  logInvalidHmsetValues: environmentVariableTrue(pe,
    'LOG_INVALID_HMSET_VALUES'),

  // Enable GET from cache for /v1/subjects, /v1/subjects/{key}
  getSubjectFromCache: environmentVariableTrue(pe,
    'GET_SUBJECT_FROM_CACHE'),

  // Enable caching for GET /v1/perspectives/{key}?
  enableCachePerspective: environmentVariableTrue(pe,
    'ENABLE_CACHE_PERSPECTIVE'),

  // Enable IOREDIS instead of node redis
  enableIORedis: environmentVariableTrue(pe, 'ENABLE_IOREDIS'),

  // Enable graceful shutdown handling event
  enableSigtermEvent: environmentVariableTrue(pe, 'ENABLE_SIGTERM_EVENT'),

  // Enable using worker dyno for hierarchy queries
  enqueueHierarchy: environmentVariableTrue(pe, 'ENQUEUE_HIERARCHY'),

  // Add some job queue instrumentation logging
  instrumentKue: environmentVariableTrue(pe, 'INSTRUMENT_KUE'),

  instrumentCompleteSubjectHierarchy: environmentVariableTrue(pe,
    'INSTRUMENT_COMPLETE_SUBJECT_HIERARCHY'),

  // require helpEmail or helpUrl in POST/PUT/PATCH of aspects and subjects
  requireHelpEmailOrHelpUrl: environmentVariableTrue(pe,
    'REQUIRE_HELP_EMAIL_OR_HELP_URL'),

  // use new socket.io namespace/room format
  useNewNamespaceFormat: environmentVariableTrue(pe, 'USE_NEW_NAMESPACE_FORMAT'),

  // use new socket.io namespace/room format for Imc rooms
  useNewNamespaceFormatImc: environmentVariableTrue(pe, 'USE_NEW_NAMESPACE_FORMAT_IMC'),

  // optimize sample filtered gets
  optimizeSampleFilteredGets: environmentVariableTrue(pe,
    'OPTIMIZE_SAMPLE_FILTERED_GETS'),

  enableBullForBulkDelSubj: environmentVariableTrue(
    pe, 'ENABLE_BULL_FOR_BULK_DEL_SUBJ'),
}; // shortTermToggles

featureToggles.load(Object.assign({}, longTermToggles, shortTermToggles));

module.exports = {
  environmentVariableTrue, // exporting to make it easy to test
  envVarIncludes, // exporting for test only
  environmentVariableFalse, // exporting for test only
};
