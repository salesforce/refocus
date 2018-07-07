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
  enableJobActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS', 'job'),
  enableKueStatsActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'kueStats'),
  enableLimiterActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'limiter'),
  enablePubStatsLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS', 'pubStats'),
  enableQueueStatsActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'queueStats'),
  enableRealtimeActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'realtime'),
  enableUnauthorizedActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'unauthorized'),
  enableWorkerActivityLogs: envVarIncludes(pe, 'ENABLE_ACTIVITY_LOGS',
    'worker'),

  // Enable heroku clock dyno
  enableClockProcess: environmentVariableTrue(pe, 'ENABLE_CLOCK_PROCESS'),

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
  /*
   * Stop making special call to db/redis to attach the subject for real-time
   * publishing after sample upsert--just use the subject we already got from
   * redis at the beginning of the upsertOneSample operation.
   */
  preAttachSubject: environmentVariableTrue(pe, 'PRE_ATTACH_SUBJECT'),

  // get subject and aspect for realtime from database
  attachSubAspFromDB: environmentVariableTrue(pe,
    'ATTACH_SUB_ASP_FROM_DB'),

  // when attaching from db, use scopes?
  attachSubAspFromDBuseScopes: environmentVariableTrue(pe,
    'ATTACH_SUB_ASP_FROM_DB_USE_SCOPES'),

  // turn on logging to log invalid hmset values
  logInvalidHmsetValues: environmentVariableTrue(pe,
    'LOG_INVALID_HMSET_VALUES'),

  // Enable GET from cache for /v1/subjects, /v1/subjects/{key}
  getSubjectFromCache: environmentVariableTrue(pe,
    'GET_SUBJECT_FROM_CACHE'),

  // Enable caching for GET /v1/perspectives/{key}?
  enableCachePerspective: environmentVariableTrue(pe,
    'ENABLE_CACHE_PERSPECTIVE'),

  // Enable using worker dyno for hierarchy queries
  enqueueHierarchy: environmentVariableTrue(pe, 'ENQUEUE_HIERARCHY'),

  // Add some job queue instrumentation logging
  instrumentKue: environmentVariableTrue(pe, 'INSTRUMENT_KUE'),

  // Look up the subject inside the promise chain when publishing sample
  publishSampleInPromiseChain: environmentVariableTrue(pe,
    'PUBLISH_SAMPLE_IN_PROMISE_CHAIN'),

  returnUser: environmentVariableTrue(pe, 'RETURN_CREATEDBY_ON_TOKEN_INPUT'),

  // require helpEmail or helpUrl in POST/PUT/PATCH of aspects and subjects
  requireHelpEmailOrHelpUrl: environmentVariableTrue(
    pe, 'REQUIRE_HELP_EMAIL_OR_HELP_URL'),

  autoDeactivateRooms: environmentVariableTrue(pe, 'AUTO_DEACTIVATE_ROOMS'),
}; // shortTermToggles

featureToggles.load(Object.assign({}, longTermToggles, shortTermToggles));

module.exports = {
  environmentVariableTrue, // exporting to make it easy to test
  envVarIncludes, // exporting for test only
};
