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
 * Remove null fields and empty array fields; stringify array fields.
 *
 * @param {Object} obj - The object to clean.
 * @param {Array} arrayFields - List of array fields to stringify.
 * @returns {Object} the object with no nulls and stringified arrays.
 */
function removeNullsAndStringifyArrays(obj, arrayFields) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === null || (Array.isArray(obj[key]) &&
    obj[key].length === 0)) { // eslint-disable-line no-magic-numbers
      delete obj[key];
    } else if (arrayFields.includes(key)) {
      obj[key] = JSON.stringify(obj[key]);
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

module.exports = {
  cleanAspect,
  cleanSample,
  constants,
  toKey,
};
