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
const sub = redis.createClient(rconf.instanceUrl.pubsub);
sub.subscribe(rconf.channelName);

module.exports = {
  client: {
    cache: redis.createClient(rconf.instanceUrl.cache),
    limiter: redis.createClient(rconf.instanceUrl.limiter),
    pub: redis.createClient(rconf.instanceUrl.pubsub),
    realtimeLogging: redis.createClient(rconf.instanceUrl.realtimeLogging),
    sampleStore: redis.createClient(rconf.instanceUrl.sampleStore),
    sub,
  },
};
