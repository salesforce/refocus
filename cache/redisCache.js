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
 * client.get().then(...)).
 */
const bluebird = require('bluebird');
const { promisify } = require('util');
// bluebird.promisifyAll(redis);

console.log('\n\n\n\n\n rconf in redisCache ==>>>>>>>>>> ', rconf);

const setupRedisClients = () => {
  try {
    console.log('Starting Redis client setup...');
    const createRedisClient = (url, opts) => {
      console.log('url', url);
      console.log('opts', opts);
      const redisClient = redis.createClient(url, opts);
      redisClient.on("error", (error) => console.error(`connection Error : ${error}`));
      redisClient.connect().catch(console.error);
  
      // Promisify the entire prototype
      // bluebird.promisifyAll(redisClient.constructor.prototype, { multiArgs: true });
      return redisClient;
    };
  
    const retryStrategy = (options) => {
      if (options.total_retry_time > rconf.retryStrategy.totalRetryTime) {
        return new Error('Retry time exhausted');
      }
  
      if (options.attempt > rconf.retryStrategy.attempt) {
        return undefined;
      }
  
      return Math.min(options.attempt * rconf.retryStrategy.backoffFactor, rconf.retryStrategy.backoffMax);
    };
  
    const opts = {
      retry_strategy: retryStrategy,
      tls: {
        rejectUnauthorized: false
      },
      legacyMode: true,
      // disableOfflineQueue: true,
    };
  
    if (featureToggles.isFeatureEnabled('enableRedisConnectionLogging')) {
      logger.info('Redis Retry Strategy', opts);
    }
  
    const subPerspectives = [];
    const pubPerspectives = [];
  
    const setupPubSubClient = (url) => {
      console.log('\n\n pubsubPerspectives', url);
  
      if (!featureToggles.isFeatureEnabled('enableRealtimeApplication')) {
        const s = createRedisClient(url, opts);
        s.subscribe(rconf.perspectiveChannelName, (message) => {
          console.log('perspectiveChannelName', rconf.perspectiveChannelName, message);
        });
        subPerspectives.push(s);
      }
  
      const pubClient = createRedisClient(url, opts);
      pubPerspectives.push(pubClient);
    };
  
    for (const rp of rconf.instanceUrl.pubsubPerspectives) {
      setupPubSubClient(rp);
    }
  
    console.log('\n\n\n\n\n rconf ==>>>>>>>>>> ', rconf);
    // Only create subscribers here if we're doing real-time events from the main app
    let subBot;
    if (!featureToggles.isFeatureEnabled('enableRealtimeApplicationImc')) {
      console.log('\n\n enableRealtimeApplicationImc');
      subBot = createRedisClient(rconf.instanceUrl.pubsubBots, opts);
      subBot.subscribe(rconf.botChannelName, (message) => {
        console.log('botChannelName', rconf.botChannelName, message);
      });
    }
  
    const client = {
      cache:  createRedisClient(rconf.instanceUrl.cache, opts),
      clock:  createRedisClient(rconf.instanceUrl.clock, opts),
      heartbeat:  createRedisClient(rconf.instanceUrl.heartbeat, opts),
      limiter:  createRedisClient(rconf.instanceUrl.limiter, opts),
      pubPerspectives,
      pubBot:  createRedisClient(rconf.instanceUrl.pubsubBots, opts),
      realtimeLogging: createRedisClient(rconf.instanceUrl.realtimeLogging, opts),
      sampleStore: redis.createClient(rconf.instanceUrl.sampleStore, opts),
      subPerspectives,
      subBot,
    };
  
    /**
     * Register redis client handlers.
     *
     * @param {String} name - The name of this redis client
     * @param {Object} cli - The redis client
     */
    const registerHandlers = (name, cli) => {
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
    };
  
    for (const key of Object.keys(client)) {
      const cli = client[key];
      if (Array.isArray(cli)) {
        cli.forEach((c) => registerHandlers(key, c));
      } else if (cli) {
        registerHandlers(key, cli);
      }
    }
    console.log('Setup completed successfully');
    return { client };
  } catch(error) {
    console.error('Error setting up Redis cache:', error);
    throw error;
  }
};

module.exports = (() => {
  try {
    return setupRedisClients();
  } catch (error) {
    console.error('Error initializing Redis client:', error);
    throw error;
  }
})();

// module.exports = setupRedisClients();
