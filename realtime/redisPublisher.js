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
const rtUtils = require('./utils');
const config = require('../config');
const client = require('../cache/redisCache').client;
const pubPerspective = client.pubPerspective;
const perspectiveChannelName = config.redis.perspectiveChannelName;
const sampleEvent = require('./constants').events.sample;
const logger = require('winston');

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
  obj[event] = inst;

  // set pub client and channel to perspective unless there are overrides opts
  let pubClient = pubPerspective;
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
    const prepared = prepareToPublish(inst, changedKeys, ignoreAttributes);
    if (!prepared) return false;
    obj[event] = prepared;
  }

  pubClient.publish(channelName, JSON.stringify(obj));
  return obj;
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
 * @param  {Model} aspectModel  - The aspect model to get the related
 *  aspect instance
 * @returns {Promise} - which resolves to a sample object
 */
function publishSample(sampleInst, subjectModel, event, aspectModel) {
  if (sampleInst.hasOwnProperty('noChange') && sampleInst.noChange === true) {
    return publishSampleNoChange(sampleInst);
  }

  const eventType = event || getSampleEventType(sampleInst);
  let prom;

  // No need to attachAspectSubject if subject and aspect are already attached
  if (sampleInst.hasOwnProperty('subject') &&
    sampleInst.hasOwnProperty('aspect')) {
    prom = Promise.resolve(sampleInst);
  } else {
    prom = rtUtils.attachAspectSubject(sampleInst, subjectModel, aspectModel);
  }

  return prom
    .then((sample) => {
      if (sample) {
        sample.absolutePath = sample.subject.absolutePath; // reqd for filtering
        publishObject(sample, eventType);
        return sample;
      }
    })
    .catch((err) => {
      // Any failure on publish sample must not stop the next promise.
      logger.error('Error to publish sample - ' + err);
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
    absolutePath: sample.absolutePath, // used for persp filtering
    updatedAt: sample.updatedAt,
    subject: {
      absolutePath: sample.absolutePath,
      tags: sample.subjectTags, // for socket.io perspective filtering
    },
    aspect: {
      name: sample.aspectName, // for socket.io perspective filtering
      tags: sample.aspectTags, // for socket.io perspective filtering
      /*
       * aspect.timeout is needed by perspective to track whether page is still
       * getting real-time events
       */
      timeout: sample.aspectTimeout,
    },
  };
  return Promise.resolve(true)
  .then(() => {
    publishObject(s, sampleEvent.nc);
    return sample;
  });
} // publishSampleNoChange

module.exports = {
  publishObject,
  publishSample,
  getSampleEventType,
}; // exports
