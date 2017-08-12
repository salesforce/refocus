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
const rconf = require('../config').redis;

/*
 * This will add "...Async" to all node_redis functions (e.g. return
 * client.getAsync().then(...)).
 */
const bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const opts = {
  /**
   * Redis Client Retry Strategy:
   * - Stop retrying if we're getting an ECONNREFUSED error. Flush all
   *   commands with a custom error message.
   * - Stop retrying if it's been over an hour since the last successful
   *   connection. Flush all commands with a custom error message.
   * - Stop retrying if we've already tried 10 times. Flush all commands with
   *   the standard built-in error.
   * - Try to reconnect with a simple back-off strategy: the lower of either 3
   *   seconds OR (the number of previous attempts * 100ms).
   */
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('The server refused the connection');
    }

    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Retry time exhausted');
    }

    if (options.attempt > 10) {
      return undefined;
    }

    return Math.min(options.attempt * 100, 3000);
  }, // retryStrategy
};

const sub = redis.createClient(rconf.instanceUrl.pubsub, opts);
sub.subscribe(rconf.channelName);

const client = {
  cache: redis.createClient(rconf.instanceUrl.cache, opts),
  limiter: redis.createClient(rconf.instanceUrl.limiter, opts),
  pub: redis.createClient(rconf.instanceUrl.pubsub, opts),
  realtimeLogging: redis.createClient(rconf.instanceUrl.realtimeLogging,
    opts),
  sampleStore: redis.createClient(rconf.instanceUrl.sampleStore, opts),
  sub,
};

Object.keys(client).forEach((key) => {
  client[key].on('error', (err) => {
    console.log(`redis client connection [${key}]`, err);
    return new Error(err);
  });

  client[key].on('reconnecting', () => {
    console.log(`redis client connection [${key}] trying to reconnect`);
  });
});

module.exports = {
  client,
};
