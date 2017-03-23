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

const pub = require('../cache/redisCache').client.pub;
const channelName = require('../config').redis.channelName;
const sampleEvent = require('./constants').events.sample;

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
 * @returns {Object} - object that was published
 */
function publishObject(inst, event, changedKeys, ignoreAttributes) {
  const obj = {};
  obj[event] = inst;

  /**
   * The shape of the object required for update events are a bit different.
   * changedKeys and ignoreAttributes are passed in as arrays by the
   * afterUpdate hooks of the models, which are passed to the prepareToPublish
   * to get the object just for update events.
   */
  if (Array.isArray(changedKeys) && Array.isArray(ignoreAttributes)) {
    obj[event] = prepareToPublish(inst, changedKeys, ignoreAttributes);
  }

  if (obj[event]) {
    return pub.publish(channelName.toString(), JSON.stringify(obj));
  }

  return obj;
} // publishChange

/**
 * The sample object needs to be attached its subject object and it also needs
 * a absolutePath field added to it before the sample is published to the redis
 * channel.
 * @param  {Object} sampleInst - The sample instance to be published
 * @param  {Model} subjectModel - The subject model to get the related
 * subject instance
 * @param  {String} event  - Type of the event that is being published
 * @param  {Model} aspectModel  - The aspect model to get the related
 * aspect instance
 * @returns {Promise} - which resolves to a sample object
 */
function publishSample(sampleInst, subjectModel, event, aspectModel) {
  const eventType = event || getSampleEventType(sampleInst);
  const sample = sampleInst.get ? sampleInst.get() : sampleInst;
  const nameParts = sample.name.split('|');
  const subName = nameParts[0];
  const aspName = nameParts[1];
  const subOpts = {
    where: {
      absolutePath: subName,
    },
  };
  const aspOpts = {
    where: {
      name: aspName,
    },
  };
  const getAspect = aspectModel ? aspectModel.findOne(aspOpts) :
                            Promise.resolve(sample.aspect);
  return getAspect
  .then((asp) => {
    sample.aspect = asp.get ? asp.get() : asp;
    return subjectModel.findOne(subOpts);
  })
  .then((sub) => {
    if (sub) {

      /*
       *pass the sample instance to the publishObject function only if the
       *aspect and subject are published
       */
      if (sample.aspect && sample.aspect.isPublished && sub.isPublished) {
        // attach subject to the sample
        sample.subject = sub.get();

        // attach absolutePath field to the sample
        sample.absolutePath = subName;
        publishObject(sample, eventType);
      }
    }

    return sample;
  });
} // publishSample

module.exports = {
  publishObject,
  publishSample,
  getSampleEventType,
}; // exports
