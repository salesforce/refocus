/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./realTime/redisPublisher.js
 */
'use strict'; // eslint-disable-line strict
const logger = require('winston');
const featureToggles = require('feature-toggles');
const rtUtils = require('./utils');
const config = require('../config');
const client = require('../cache/redisCache').client;
const pubPerspectives = client.pubPerspectives;
const perspectiveChannelName = config.redis.perspectiveChannelName;
const sampleEvent = require('./constants').events.sample;
const pubSubStats = require('./pubSubStats');
const ONE = 1;

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Store pub stats in redis cache, tracking count and publish time by key. Note
 * that we're using the async redis command here; we don't require the hincrby
 * command to complete before moving on to other work, so we're not wrapping it
 * in a promise.
 *
 * @param {String} key - The event type
 * @param {Object} obj - The object being published
 */
function trackStats(key, obj) {
  let elapsed = 0;
  if (obj.hasOwnProperty('updatedAt')) {
    elapsed = Date.now() - new Date(obj.updatedAt);
  } else if (obj.hasOwnProperty('new') &&
    obj.new.hasOwnProperty('updatedAt')) {
    elapsed = Date.now() - new Date(obj.new.updatedAt);
  } else {
    console.trace('Where is updatedAt? ' + JSON.stringify(obj));
  }

  rcache.hincrbyAsync(pubKeys.count, key, ONE)
    .catch((err) => {
      console.error('redisPublisher.trackStats HINCRBY', pubKeys.count, key,
        ONE);
    });
  rcache.hincrbyAsync(pubKeys.time, key, elapsed)
    .catch((err) => {
      console.error('redisPublisher.trackStats HINCRBY', pubKeys.time, key,
        elapsed, err);
    });
} // trackStats

/**
 * When passed an sample object, either a sequelize sample object or
 * a plain sample object, it returns either an sample add event or an sample
 * update event.
 * @param  {Object} sample - A sample Object
 * @returns {String}  - an sample add event if updatedAt timestamp is equal to
 * createdAt timestamp, returns an update event otherwise.
 */
function getSampleEventType(sample) {
  const updatedAt = new Date(sample.updatedAt).getTime();
  const createdAt = new Date(sample.createdAt).getTime();
  return updatedAt === createdAt ? sampleEvent.add : sampleEvent.upd;
} // getSampleEventType

/**
 * This function returns an object to be published via redis channel
 * @param  {Object} inst  -  Model instance
 * @param  {[Array]} changedKeys - An array containing the fields of the model
 * that were changed
 * @param  {[Array]} ignoreAttributes An array containing the fields of the
 * model that should be ignored
 * @returns {Object} - Returns an object that is ready to be published Or null
 * if there are no changedfields.
 */
function prepareToPublish(inst, changedKeys, ignoreAttributes) {
  // prepare the data iff changed fields are not in ignoreAttributes
  const ignoreSet = new Set(ignoreAttributes);
  for (let i = 0; i < changedKeys.length; i++) {
    if (!ignoreSet.has(changedKeys[i])) {
      return {
        old: inst, // done to maintain the shape of the object to publish
        new: inst,
      };
    }
  }

  return null;
} // prepareToPublish

/**
 * This function publishes an created, updated or a deleted model instance to
 * the redis channel and returns the object that was published
 *
 * @param  {Object} inst - Model instance to be published
 * @param  {String} event  - Type of the event that is being published
 * @param  {[Array]} changedKeys - An array containing the fields of the model
 * that were changed
 * @param  {[Array]} ignoreAttributes An array containing the fields of the
 * model that should be ignored
 * @param  {Object} opts - Options for which client and channel to publish with
 * @returns {Object} - object that was published
 */
function publishObject(inst, event, changedKeys, ignoreAttributes, opts) {
  if (!inst || !event) return false;
  const obj = {};
  obj[event] = inst.get ? inst.get() : inst;

  /*
   * Set pub client and channel to perspective unless there are overrides opts.
   * There may be multiple publishers for perspectives to spread the load, so
   * pick one at random.
   */
  const len = pubPerspectives.length;
  const whichPubsub = len === 1 ? 0 : getRandomInt(0, (len - 1));
  let pubClient = pubPerspectives[whichPubsub];
  let channelName = perspectiveChannelName;
  if (opts) {
    obj[event].pubOpts = opts;
    pubClient = opts.client ? client[opts.client] : pubClient;
    channelName = opts.channel ? config.redis[opts.channel] : channelName;
  }

  /**
   * The shape of the object required for update events are a bit different.
   * changedKeys and ignoreAttributes are passed in as arrays by the
   * afterUpdate hooks of the models, which are passed to the prepareToPublish
   * to get the object just for update events.
   */
  if (Array.isArray(changedKeys) && Array.isArray(ignoreAttributes)) {
    const prepared = prepareToPublish(obj[event], changedKeys,
      ignoreAttributes);
    if (!prepared) return false;
    obj[event] = prepared;
  }

  if (featureToggles.isFeatureEnabled('enablePubsubStatsLogs')) {
    try {
      pubSubStats.track('pub', event, obj[event]);
    } catch (err) {
      console.error(err);
    }
  }

  // console.log('publishing >>', obj);
  return pubClient.publishAsync(channelName, JSON.stringify(obj))
    .then((numClients) => obj);
} // publishObject

/**
 * The sample object needs to be attached its subject object and it also needs
 * a absolutePath field added to it before the sample is published to the redis
 * channel.
 *
 * @param  {Object} sampleInst - The sample instance to be published
 * @param  {Model} subjectModel - The subject model to get the related
 *  subject instance
 * @param  {String} event  - Type of the event that is being published
 * @returns {Promise} - which resolves to a sample object
 */
function publishSample(sampleInst, event) {
  /**
   * TODO: Needs to be deleted once sample store is updated because sample will
   * no longer have these attributes.
   */

  delete sampleInst.aspectId;
  delete sampleInst.subjectId;
  delete sampleInst.aspect;
  delete sampleInst.subject;

  if (sampleInst.hasOwnProperty('noChange') && sampleInst.noChange === true) {
    return publishSampleNoChange(sampleInst);
  }

  const eventType = event || getSampleEventType(sampleInst);

  return publishObject(sampleInst, eventType)
    .then(() => sampleInst)
    .catch((err) => {
      // Any failure on publish sample must not stop the next promise.
      logger.error('publishSample error', err);
      return Promise.resolve();
    });

} // publishSample

/**
 * Publish a sample when nothing changed except last update timestamp.
 *
 * @param  {Object} sample - The sample to be published
 * @returns {Promise} - which resolves to the object that was published
 */
function publishSampleNoChange(sample) {
  const s = {
    name: sample.name,
    status: sample.status, // for socket.io perspective filtering
    updatedAt: sample.updatedAt,
  };

  return publishObject(s, sampleEvent.nc)
    .then(() => sample);
} // publishSampleNoChange

module.exports = {
  publishObject,
  publishSample,
  getSampleEventType,
}; // exports
