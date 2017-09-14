/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./cache/redisCache.js
 *
 * Set up redis client connections.
 */
'use strict'; // eslint-disable-line strict
const redis = require('redis');
const logger = require('winston');
const rconf = require('../config').redis;
const featureToggles = require('feature-toggles');

/*
 * This will add "...Async" to all node_redis functions (e.g. return
 * client.getAsync().then(...)).
 */
const bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const opts = {
  /* Redis Client Retry Strategy */
  retry_strategy: (options) => {
    /*
     * Stop retrying if we've exceeded the configured threshold since the last
     * successful connection. Flush all commands with a custom error message.
     */
    if (options.total_retry_time > rconf.retryStrategy.totalRetryTime) {
      return new Error('Retry time exhausted');
    }

    /*
     * Stop retrying if we've already tried the maximum number of configured
     * attempts. Flush all commands with the standard built-in error.
     */
    if (options.attempt > rconf.retryStrategy.attempt) {
      return undefined;
    }

    /*
     * Try to reconnect with a simple back-off strategy: the lower of either
     * the configured backoffMax OR (the number of previous attempts * the
     * the configured backoffFactor).
     */
    return Math.min(options.attempt * rconf.retryStrategy.backoffFactor,
      rconf.retryStrategy.backoffMax);
  }, // retryStrategy
};

if (featureToggles.isFeatureEnabled('enableRedisConnectionLogging')) {
  logger.info('Redis Retry Strategy', opts);
}

const subPerspective = redis.createClient(rconf.instanceUrl.pubsubPerspective, opts);
subPerspective.subscribe(rconf.perspectiveChannelName);

const subBot = redis.createClient(rconf.instanceUrl.pubsubBots, opts);
subBot.subscribe(rconf.botChannelName);

const client = {
  cache: redis.createClient(rconf.instanceUrl.cache, opts),
  limiter: redis.createClient(rconf.instanceUrl.limiter, opts),
  pubPerspective: redis.createClient(rconf.instanceUrl.pubsubPerspective, opts),
  pubBot: redis.createClient(rconf.instanceUrl.pubsubBots, opts),
  realtimeLogging: redis.createClient(rconf.instanceUrl.realtimeLogging,
   opts),
  sampleStore: redis.createClient(rconf.instanceUrl.sampleStore, opts),
  subPerspective,
  subBot,
};

Object.keys(client).forEach((key) => {
  client[key].on('error', (err) => {
    logger.error(`redisClientConnection=${key} event=error`, err);
    return new Error(err);
  });

  if (featureToggles.isFeatureEnabled('enableRedisConnectionLogging')) {
    client[key].on('connect', () => {
      logger.info(`redisClientConnection=${key} event=connect`);
    });

    client[key].on('ready', () => {
      logger.info(`redisClientConnection=${key} event=ready`);
    });

    client[key].on('reconnecting', () => {
      logger.info(`redisClientConnection=${key} event=reconnecting`);
    });
  }
});

module.exports = {
  client,
};
