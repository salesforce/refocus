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
const PFX = 'samsto';
const SEP = ':';
const ASPECT_IDX = PFX + SEP + 'aspects';
const ASPECT_PFX = PFX + SEP + 'aspect' + SEP;
const SAMPLE_IDX = PFX + SEP + 'samples';
const SAMPLE_PFX = PFX + SEP + 'sample' + SEP;
const SUBJECT_IDX = PFX + SEP + 'subjects';
const SUBJECT_PFX = PFX + SEP + 'subject' + SEP;
const SAMPLE_FIELDS_TO_STRINGIFY = [
  'relatedLinks',
];
const ASPECT_FIELDS_TO_STRINGIFY = [
  'relatedLinks',
  'tags',
  'criticalRange',
  'warningRange',
  'infoRange',
  'okRange',
];

/**
 * Clear all the "sampleStore" keys (for subjects, aspects, samples) from
 * redis.
 *
 * @returns {Promise} upon completion.
 */
function clean() {
  const promises = [ASPECT_IDX, SAMPLE_IDX, SUBJECT_IDX].map((s) => {
    return redisClient.smembersAsync(s)
    .then((keys) => {
      keys.push(s);
      return redisClient.delAsync(s);
    })
    .catch((err) => {
      // NO-OP
      console.error(err); // eslint-disable-line no-console
      Promise.resolve(true);
    });
  });
  return Promise.all(promises);
} // clean

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
  retval = removeNullsAndStringifyArrays(retval, ASPECT_FIELDS_TO_STRINGIFY);
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
  retval = removeNullsAndStringifyArrays(retval, SAMPLE_FIELDS_TO_STRINGIFY);
  return retval;
} // cleanSample

/**
 * Populate the redis sample store from the db.
 *
 * @returns {Promise} which resolves to the redis response.
 */
function populate() {
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
      const absPath = nameParts[0].toLowerCase();
      const aspectName = nameParts[1].toLowerCase();
      const subKey = SUBJECT_PFX + absPath;
      const aspKey = ASPECT_PFX + aspectName;
      const samKey = SAMPLE_PFX + s.name.toLowerCase();
      subjectIdx.add(subKey);
      aspectIdx.add(aspKey);
      sampleIdx.add(samKey);
      if (subjectSets.hasOwnProperty(subKey)) {
        subjectSets[subKey].push(aspKey);
      } else {
        subjectSets[subKey] = [aspKey];
      }

      if (!aspectHashes.hasOwnProperty(aspKey)) {
        aspectHashes[aspKey] = cleanAspect(s.aspect);
      }

      sampleHashes[samKey] = cleanSample(s);
    });

    const commands = [];
    commands.push(['sadd', SUBJECT_IDX, Array.from(subjectIdx)]);
    commands.push(['sadd', ASPECT_IDX, Array.from(aspectIdx)]);
    commands.push(['sadd', SAMPLE_IDX, Array.from(sampleIdx)]);
    Object.keys(subjectSets).forEach((key) => {
      commands.push(['sadd', key, subjectSets[key]]);
    });
    Object.keys(aspectHashes).forEach((key) => {
      commands.push(['hmset', key, aspectHashes[key]]);
    });
    Object.keys(sampleHashes).forEach((key) => {
      commands.push(['hmset', key, sampleHashes[key]]);
    });
    return redisClient.batch(commands).execAsync();
  })
  .catch(console.error); // eslint-disable-line no-console
} // populate

/**
 * Returns true if all three index keys exist in redis.
 *
 * @returns {Promise} which resolves to true if all three index keys exist in
 *  redis.
 */
function indexKeysExist() {
  const EXPECTED = 3;
  return redisClient.existsAsync(SUBJECT_IDX, SAMPLE_IDX, ASPECT_IDX)
  .then((num) => (num === EXPECTED));
} // indexKeysExist

/**
 * Initializes the redis sample store from the db if the sample store index
 * keys do not already exist.
 *
 * @returns {Promise} which resolves to true upon completion.
 */
function init() {
  return indexKeysExist()
  .then((keysAlreadyExist) => {
    if (keysAlreadyExist) {
      return true;
    }

    return db2redis();
  });
} // init

module.exports = {
  init,
  populate,
  clean,
};
