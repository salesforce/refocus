/**
 * ./pubsub.js
 *
 * Instantiates two redis clients: the 'publisher' and 'subscriber'.
 * Subscribes the subscriber to the channel in config.
*/

const redis = require('redis');
const conf = require('./config');
const env = conf.environment[conf.nodeEnv];

const pub = redis.createClient(env.redisUrl);;
const sub = redis.createClient(env.redisUrl);;

sub.subscribe(conf.redis.channelName);

module.exports = { pub, sub };
