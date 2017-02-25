/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./cache/sampleStore.js
 *
 * Redis Cache
 */
'use strict'; // eslint-disable-line strict
const redisClient = require('./redisCache').client.sampleStore;
const Sample = require('../db').Sample;
const featureToggles = require('feature-toggles');
const PFX = 'samsto';
const SEP = ':';
const constants = {
  featureName: 'enableRedisSampleStore',
  fieldsToStringify: {
    aspect: [
      'relatedLinks',
      'tags',
      'criticalRange',
      'warningRange',
      'infoRange',
      'okRange',
    ],
    sample: ['relatedLinks'],
  },
  indexKey: {
    aspect: PFX + SEP + 'aspects',
    sample: PFX + SEP + 'samples',
    subject: PFX + SEP + 'subjects',
  },
  objectType: { aspect: 'aspect', sample: 'sample', subject: 'subject' },
  prefix: PFX,
  separator: SEP,
};

/**
 * Generates redis key for given object type and name.
 *
 * @param {String} type - The object type (aspect, sample, subject).
 * @param {String} name - The object's name or absolutePath.
 * @returns {String} the generated redis key
 */
function toKey(type, name) {
  return PFX + SEP + type + SEP + name.toLowerCase();
} // toKey

/**
 * Clear all the "sampleStore" keys (for subjects, aspects, samples) from
 * redis.
 *
 * @returns {Promise} upon completion.
 */
function eradicate() {
  const promises = Object.getOwnPropertyNames(constants.indexKey)
    .map((s) => redisClient.smembersAsync(constants.indexKey[s])
    .then((keys) => {
      keys.push(constants.indexKey[s]);
      return redisClient.delAsync(keys);
    })
    .catch((err) => {
      // NO-OP
      console.error(err); // eslint-disable-line no-console
      Promise.resolve(true);
    }));
  return Promise.all(promises);
} // eradicate

/**
 * Remove nulls and stringify arrays.
 *
 * @param {Object} obj - The object to clean.
 * @param {Array} arrayFields - List of array fields to stringify.
 * @returns {Object} the object with no nulls and stringified arrays.
 */
function removeNullsAndStringifyArrays(obj, arrayFields) {
  Object.keys(obj).forEach((key) => {
    if (arrayFields.includes(key)) {
      obj[key] = JSON.stringify(obj[key]);
    } else if (obj[key] === null) {
      delete obj[key];
    }
  });
  return obj;
} // removeNullsAndStringifyArrays

/**
 * Remove nulls and stringify arrays.
 *
 * @param {Object} a - The aspect to clean.
 * @returns {Object} cleaned up and ready to store in redis.
 */
function cleanAspect(a) {
  let retval = a.get();
  retval = removeNullsAndStringifyArrays(retval,
    constants.fieldsToStringify.aspect);
  return retval;
} // cleanAspect

/**
 * Remove the aspect field, remove nulls and stringify arrays.
 *
 * @param {Object} s - The sample to clean.
 * @returns {Object} cleaned up and ready to store in redis.
 */
function cleanSample(s) {
  let retval = s.get();
  delete retval.aspect;
  retval = removeNullsAndStringifyArrays(retval,
    constants.fieldsToStringify.sample);
  return retval;
} // cleanSample

/**
 * Populate the redis sample store from the db.
 *
 * @returns {Promise} which resolves to the list of redis batch responses, or
 *  false if the feature is not enabled.
 */
function populate() {
  if (!featureToggles.isFeatureEnabled(constants.featureName)) {
    return Promise.resolve(false);
  }

  return Sample.findAll()
  .then((samples) => {
    const subjectIdx = new Set();
    const aspectIdx = new Set();
    const sampleIdx = new Set();
    const subjectSets = {};
    const aspectHashes = {};
    const sampleHashes = {};

    samples.forEach((s) => {
      const nameParts = s.name.split('|');

      // Generate the redis keys for this aspect, sample and subject.
      const aspKey = toKey(constants.objectType.aspect,
        nameParts[1]); // eslint-disable-line no-magic-numbers
      const samKey = toKey(constants.objectType.sample, s.name);
      const subKey = toKey(constants.objectType.subject,
        nameParts[0]); // eslint-disable-line no-magic-numbers

      // Track each of these in the master indexes for each object type.
      aspectIdx.add(aspKey);
      sampleIdx.add(samKey);
      subjectIdx.add(subKey);

      // For creating each individual subject set...
      if (subjectSets.hasOwnProperty(subKey)) {
        subjectSets[subKey].push(aspKey);
      } else {
        subjectSets[subKey] = [aspKey];
      }

      // For creating each individual aspect hash...
      if (!aspectHashes.hasOwnProperty(aspKey)) {
        aspectHashes[aspKey] = cleanAspect(s.aspect);
      }

      // For creating each individual sample hash...
      sampleHashes[samKey] = cleanSample(s);
    });

    // Batch of commands to create the master indexes..
    const indexCmds = [
      ['sadd', constants.indexKey.subject, Array.from(subjectIdx)],
      ['sadd', constants.indexKey.aspect, Array.from(aspectIdx)],
      ['sadd', constants.indexKey.sample, Array.from(sampleIdx)],
    ];
    const batchPromises = [redisClient.batch(indexCmds).execAsync()];

    // Batch of commands to create each individal aspect hash...
    const aspectCmds = Object.keys(aspectHashes)
      .map((key) => ['hmset', key, aspectHashes[key]]);
    batchPromises.push(redisClient.batch(aspectCmds).execAsync());

    // Batch of commands to create each individal subject set...
    const subjectCmds = Object.keys(subjectSets)
      .map((key) => ['sadd', key, subjectSets[key]]);
    batchPromises.push(redisClient.batch(subjectCmds).execAsync());

    // Batch of commands to create each individal sample hash...
    const sampleCmds = Object.keys(sampleHashes)
      .map((key) => ['hmset', key, sampleHashes[key]]);
    batchPromises.push(redisClient.batch(sampleCmds).execAsync());

    // Return once all batches have completed.
    return Promise.all(batchPromises);
  })
  .catch(console.error); // eslint-disable-line no-console
} // populate

/**
 * Checks whether the sample store exists by counting the members of the three
 * index keys (samples, subjects, aspects). If any has more than one member,
 * consider the sample store as existing.
 *
 * @returns {Promise} which resolves to true if the sample store already
 *  exists.
 */
function sampleStoreExists() {
  const cmds = [
    ['scard', constants.indexKey.aspect],
    ['scard', constants.indexKey.sample],
    ['scard', constants.indexKey.subject],
  ];
  return redisClient.batch(cmds).execAsync()
  .then((batchResponse) =>
    batchResponse[0] > 0 || // eslint-disable-line no-magic-numbers
    batchResponse[1] > 0 || // eslint-disable-line no-magic-numbers
    batchResponse[2] > 0); // eslint-disable-line no-magic-numbers
} // sampleStoreExists

/**
 * Initializes the redis sample store from the db if the feature is enabled and
 * the sample store index keys do not already exist.
 *
 * @returns {Promise} which resolves to true if sample store is enabled and
 *  has completed initialization; resolves to false if feature is not
 *  enabled.
 */
function init() {
  if (!featureToggles.isFeatureEnabled(constants.featureName)) {
    return Promise.resolve(false);
  }

  return sampleStoreExists()
  .then((exists) => {
    if (exists) {
      return Promise.resolve(true);
    }

    return populate();
  });
} // init

module.exports = {
  eradicate,
  cleanAspect,
  cleanSample,
  constants,
  init,
  populate,
  toKey,
};
