/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./redisCache.js
 *
 * Redis Cache
 */

'use strict'; // eslint-disable-line strict

const redis = require('redis');

/*
 * This will add "...Async" to all node_redis functions (e.g. return
 * client.getAsync().then(...)).
 */
const bluebird = require('bluebird');
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

const conf = require('../config');
const env = conf.environment[conf.nodeEnv];

const client = redis.createClient(env.redisUrl);

module.exports = {
  client,
};
