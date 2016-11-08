/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./pubsub.js
 *
 * Instantiates two redis clients: the 'publisher' and 'subscriber'.
 * Subscribes the subscriber to the channel in config.
*/

const redis = require('redis');
const conf = require('./config');
const env = conf.environment[conf.nodeEnv];

const pub = redis.createClient(env.redisUrl);
const sub = redis.createClient(env.redisUrl);

sub.subscribe(conf.redis.channelName);

module.exports = { pub, sub };
