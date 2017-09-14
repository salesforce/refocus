/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./config/redisConfig.js
 *
 * Assigns each of the different redis uses cases to a particular redis
 * instance, if configured, or falls back to the primary redis instance.
 */
'use strict'; // eslint-disable-line strict
const pe = process.env; // eslint-disable-line no-process-env
const DEFAULT_LOCAL_REDIS_URL = '//127.0.0.1:6379';
const PRIMARY_REDIS = (pe.REDIS_URL || DEFAULT_LOCAL_REDIS_URL);
const perspectiveChannelName = 'focus';
const botChannelName = 'imc';

module.exports = {
  perspectiveChannelName,
  botChannelName,
  instanceUrl: {
    /*
     * Cache perspectives, lenses, etc.
     */
    cache: pe.REDIS_CACHE && pe[pe.REDIS_CACHE] ?
      pe[pe.REDIS_CACHE] : PRIMARY_REDIS,

    /*
     * Keys for tracking rate limiter activity
     */
    limiter: pe.REDIS_LIMITER && pe[pe.REDIS_LIMITER] ?
      pe[pe.REDIS_LIMITER] : PRIMARY_REDIS,

    /*
     * PubSub for perspective real-time events.
     */
    pubsubPerspective: pe.REDIS_PUBSUB_PERSPECTIVES && pe[pe.REDIS_PUBSUB_PERSPECTIVES] ?
      pe[pe.REDIS_PUBSUB_PERSPECTIVES] : PRIMARY_REDIS,

    /*
     * PubSub for bots real-time events.
     */
    pubsubBots: pe.REDIS_PUBSUB_BOTS && pe[pe.REDIS_PUBSUB_BOTS] ?
      pe[pe.REDIS_PUBSUB_BOTS] : PRIMARY_REDIS,

    /*
     * Kue job queue for work being delegated to worker dynos.
     */
    queue: pe.REDIS_QUEUE && pe[pe.REDIS_QUEUE] ?
      pe[pe.REDIS_QUEUE] : PRIMARY_REDIS,

    /*
     * Transient data about socket connections from browsers with an open
     * perspective, for logging activity=realtime.
     */
    realtimeLogging: pe.REDIS_REALTIME_LOGGING &&
      pe[pe.REDIS_REALTIME_LOGGING] ? pe[pe.REDIS_REALTIME_LOGGING] :
      PRIMARY_REDIS,

    /*
     * SampleStore is the primary persistent store for samples, and an active
     * cache for aspects and subjects.
     */
    sampleStore: pe.REDIS_SAMPLE_STORE && pe[pe.REDIS_SAMPLE_STORE] ?
      pe[pe.REDIS_SAMPLE_STORE] : PRIMARY_REDIS,

    /*
     * Active browser sessions.
     */
    session: pe.REDIS_SESSION && pe[pe.REDIS_SESSION] ?
      pe[pe.REDIS_SESSION] : PRIMARY_REDIS,
  },
  retryStrategy: {
    /* Number of times to attempt to reconnect. Default 100. */
    attempt: +pe.REDIS_RETRY_ATTEMPT || 100,

    backoffFactor: +pe.REDIS_RETRY_BACKOFF_FACTOR || 100,

    backoffMax: +pe.REDIS_RETRY_BACKOFF_MAX || 3000,

    /* Time since the last successful connection. Default one hour. */
    totalRetryTime: +pe.REDIS_RETRY_TOTAL_RETRY_TIME || 3600000,
  },
};
