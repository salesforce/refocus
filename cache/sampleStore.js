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
 * Redis Sample Store Constants and Util Functions
 */
'use strict'; // eslint-disable-line strict
const redisErrors = require('./redisErrors');

const PFX = 'samsto';
const SEP = ':';
const ONE = 1;
const constants = {
  ISOfields: ['updatedAt', 'createdAt', 'statusChangedAt'],
  featureName: 'enableRedisSampleStore',
  fieldsToStringify: {
    aspect: [
      'relatedLinks',
      'tags',
      'criticalRange',
      'warningRange',
      'infoRange',
      'okRange',
      'writers',
    ],
    sample: ['relatedLinks', 'user'],
    subject: ['aspectNames'],
  },
  indexKey: {
    aspect: PFX + SEP + 'aspects',
    sample: PFX + SEP + 'samples',
    subject: PFX + SEP + 'subjects',
  },
  objectType: { aspect: 'aspect', sample: 'sample', subject: 'subject',
    subAspMap: 'subaspmap', },
  prefix: PFX,
  separator: SEP,
  previousStatusKey: PFX + SEP + 'previousSampleStoreStatus',
};

/**
 * Generates redis key for given object type and name.
 *
 * @param {String} type - The object type (aspect, sample, subject).
 * @param {String} name - The object's name or absolutePath.
 * @returns {String} the generated redis key
 */
function toKey(type, name) {
  if (name) {
    return PFX + SEP + type + SEP + name.toLowerCase();
  }

  throw new redisErrors.ResourceNotFoundError({
    explanation: `${name} not found`,
  });
} // toKey

/**
 * Get object name from key.
 * @param  {String} key - Key name
 * @returns {String} - Object name
 */
function getNameFromKey(key) {
  const splitArr = key.split(SEP);
  return splitArr[splitArr.length - ONE];
} // getNameFromKey

/**
 * Convert array strings to json from redis object. For each array field,
 * if that field exists in obj and its and array, then json parse.
 * @param  {Object} obj - Object to convert
 * @param  {Object} arrayFields - List of array fields which were stringified.
 * @returns {Object} - Converted object
 */
function arrayStringsToJson(obj, arrayFields) {
  arrayFields.forEach((field) => {
    if (obj && obj[field] && !Array.isArray(obj[field])) {
      obj[field] = JSON.parse(obj[field]);
    }
  });
  return obj;
} // arrayStringsToJson

/**
 * Remove null fields; stringify array fields.
 *
 * @param {Object} obj - The object to clean.
 * @param {Array} arrayFields - List of array fields to stringify.
 * @returns {Object} the object with no nulls and stringified arrays.
 */
function removeNullsAndStringifyArrays(obj, arrayFields) {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === null) {
      delete obj[key];
    } else if (arrayFields.includes(key)) {
      obj[key] = JSON.stringify(obj[key]);
    }
  });

  return obj;
} // removeNullsAndStringifyArrays

/**
 * Returns the ISO formatted date
 *
 * ie. input value: Mon Apr 03 2017 14:10:57 GMT-0700 (PDT)
 * output value: 2017-03-14T02:22:42.255Z
 *
 * @param {Object} obj - Contains keys whose values need be converted
 * If value is provided, return the ISO formatted date.
 * If no value, return the ISO formatted date with now time.
 * @returns {String} The date string in ISO format.

 */
function convertToISO(obj) {
  constants.ISOfields.forEach((field) => {
    if (!obj[field]) {
      obj[field] = new Date().toISOString();
    } else if (obj[field] && obj[field].toISOString) {
      obj[field] = obj[field].toISOString();
    }
  });
  return obj;
}

/**
 * Remove nulls and stringify arrays.
 *
 * @param {Object} subj - The subject to clean. This can be either be a
 * sequelize object instance or just a regular object.
 * @returns {Object} cleaned up and ready to store in redis.
 */
function cleanSubject(subj) {
  let retval = subj.get ? subj.get() : subj;
  retval = removeNullsAndStringifyArrays(retval,
    constants.fieldsToStringify.subject);
  return retval;
} // cleanSubject

/**
 * Remove nulls and stringify arrays.
 *
 * @param {Object} a - The aspect to clean. This can be either be a sequelize
 * object instance or just a regular object.
 * @returns {Object} cleaned up and ready to store in redis.
 */
function cleanAspect(a) {
  let retval = a.get ? a.get() : a;
  retval = removeNullsAndStringifyArrays(retval,
    constants.fieldsToStringify.aspect);

  // convert date time fields to proper format
  convertToISO(retval);

  return retval;
} // cleanAspect

/**
 * Remove the aspect field, remove nulls and stringify arrays.
 *
 * @param {Object} s - The sample to clean. This can be either be a sequelize
 * object instance or just a regular object.
 * @returns {Object} cleaned up and ready to store in redis.
 */
function cleanSample(s) {
  let retval = s.get ? s.get() : s;
  delete retval.aspect;
  retval = removeNullsAndStringifyArrays(retval,
    constants.fieldsToStringify.sample);

  // convert date time fields to proper format
  convertToISO(retval);

  return retval;
} // cleanSample

module.exports = {
  cleanAspect,
  cleanSubject,
  cleanSample,
  constants,
  toKey,
  arrayStringsToJson,
  getNameFromKey,
};
