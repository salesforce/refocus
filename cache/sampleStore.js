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
    ],
    sample: ['relatedLinks'],
  },
  indexKey: {
    aspect: PFX + SEP + 'aspects',
    sample: PFX + SEP + 'samples',
    subject: PFX + SEP + 'subjects',
  },
  objectType: { aspect: 'aspect', sample: 'sample', subject: 'subject' },
  persistInProgressKey: PFX + SEP + 'persistInProgress',
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
 * ie. input: Mon Apr 03 2017 14:10:57 GMT-0700 (PDT)
 * output: 2017-03-14T02:22:42.255Z
 *
 * @param {Object} date Optional input
 * @return {String} If provided date object, return the ISO formatted date.
 * If no input, return the ISO formatted date with now time.
 */
function convertToISO(date) {
  return date ? date.toISOString() : new Date().toISOString();
}

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
  let key = '';
  for (let j = constants.ISOfields.length - 1; j >= 0; j--) {
    key = constants.ISOfields[j];
    retval[key] = convertToISO(retval[key]);
  }

  return retval;
} // cleanSample

/**
 * Checks if the aspect corresponding to a sample is writable by the given user.
 *
 * @param  {Model}  aspectModel - The model object
 * @param  {String}  aspectName  - The name of the aspect
 * @param  {String}  userName  - The user name
 * @returns {Boolean} - returns true if the sample is writable by the given user
 */
function isSampleWritable(aspectModel, aspectName, userName) {
  const options = {};
  options.where = { name: { $iLike: aspectName } };
  return aspectModel.findOne(options)
  .then((aspect) => {
    if (!aspect) {
      throw new redisErrors.ResourceNotFoundError({
        explanation: 'Aspect not found.',
      });
    }

    return Promise.resolve(aspect.isWritableBy(userName));
  });
} // isSampleWritable

module.exports = {
  cleanAspect,
  cleanSample,
  constants,
  toKey,
  arrayStringsToJson,
  getNameFromKey,
  isSampleWritable,
};
