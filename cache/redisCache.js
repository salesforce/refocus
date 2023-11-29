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
const logger = require('@salesforce/refocus-logging-client');
const rconf = require('../config').redis;
const featureToggles = require('feature-toggles');

/*
 * This will add "...Async" to all node_redis functions (e.g. return
 * client.getAsync().then(...)).
 */
const bluebird = require('bluebird');
bluebird.promisifyAll(redis);

const createPromisifiedClient = (url, opts) => {
  console.log('url', url);
  console.log('opts', opts);
  const redisClient = bluebird.promisifyAll(redis.createClient(url, opts));

  redisClient.connect().catch(console.error);

  // Promisify the entire prototype
  bluebird.promisifyAll(redisClient.constructor.prototype, { multiArgs: true });

  new Promise((resolve, reject) => {
    redisClient.on('connect', () => {
      resolve();
    });

    redisClient.on('error', (err) => {
      reject(err);
    });
  });
  return redisClient;
};

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
  tls: {
    rejectUnauthorized: false
  },
};

if (featureToggles.isFeatureEnabled('enableRedisConnectionLogging')) {
  logger.info('Redis Retry Strategy', opts);
}

const subPerspectives = [];
const pubPerspectives = [];
rconf.instanceUrl.pubsubPerspectives.forEach((rp) => {
  // Only create subscribers here if we're doing real-time events from main app
  if (!featureToggles.isFeatureEnabled('enableRealtimeApplication')) {
    const s = createPromisifiedClient(rp, opts);
    s.subscribe(rconf.perspectiveChannelName);
    subPerspectives.push(s);
  }

  const pubClient = createPromisifiedClient(rp, opts);
  pubPerspectives.push(pubClient);
});

// Only create subscribers here if we're doing real-time events from main app
let subBot;
if (!featureToggles.isFeatureEnabled('enableRealtimeApplicationImc')) {
  subBot = createPromisifiedClient(rconf.instanceUrl.pubsubBots, opts);
  subBot.subscribe(rconf.botChannelName);
}

let client = {
  cache: createPromisifiedClient(rconf.instanceUrl.cache, opts),
  clock: createPromisifiedClient(rconf.instanceUrl.clock, opts),
  heartbeat: createPromisifiedClient(rconf.instanceUrl.heartbeat, opts),
  limiter: createPromisifiedClient(rconf.instanceUrl.limiter, opts),
  pubPerspectives,
  pubBot: createPromisifiedClient(rconf.instanceUrl.pubsubBots, opts),
  realtimeLogging: createPromisifiedClient(rconf.instanceUrl.realtimeLogging,
   opts),
  sampleStore: createPromisifiedClient(rconf.instanceUrl.sampleStore, opts),
  subPerspectives,
  subBot,
};

/**
 * Register redis client handlers.
 *
 * @param {String} name - The name of this redis client
 * @param {Object} cli - The redis client
 */
function registerHandlers(name, cli) {
  cli.on('error', (err) => {
    logger.error(`redisClientConnection=${name} event=error`, err);
    return new Error(err);
  });

  if (featureToggles.isFeatureEnabled('enableRedisConnectionLogging')) {
    cli.on('connect', () => {
      logger.info(`redisClientConnection=${name} event=connect`);
    });

    cli.on('ready', () => {
      logger.info(`redisClientConnection=${name} event=ready`);
    });

    cli.on('reconnecting', () => {
      logger.info(`redisClientConnection=${name} event=reconnecting`);
    });
  }
} // registerHandlers

Object.keys(client).forEach((key) => {
  const cli = client[key];
  if (Array.isArray(cli)) {
    cli.forEach((c) => registerHandlers(key, c));
  } else if (cli) {
    registerHandlers(key, cli);
  }
});

module.exports = {
  client,
};
