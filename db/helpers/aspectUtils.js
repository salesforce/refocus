/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/helpers/aspectUtils.js
 *
 * Used by the Aspect model.
 */
'use strict'; // eslint-disable-line strict
const debugRemoveAspectRelatedSamples = require('debug')('removeAspectRelatedSamples');
const sampleEvent = require('../../realtime/constants').events.sample;
const InvalidRangeValuesError = require('../dbErrors').InvalidRangeValuesError;
const InvalidRangeSizeError = require('../dbErrors').InvalidRangeSizeError;
const redisOps = require('../../cache/redisOps');
const publishSample = require('../../realtime/redisPublisher').publishSample;
const aspSubMapType = redisOps.aspSubMapType;
const dbErrors = require('../dbErrors');
const aspValueTypes = {
  boolean: 'BOOLEAN',
  numeric: 'NUMERIC',
  percent: 'PERCENT',
};

/**
 * Confirms that the array is non-null and has two elements.
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {InvalidRangeSizeError} if the array does not contain two elements
 */
function arrayHasTwoElements(arr) {
  if (arr && arr.length !== 2) {
    throw new InvalidRangeSizeError();
  }
} // arrayHasTwoElements

/**
 * Confirms that the array elements are not themselves arrays.
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {InvalidRangeValuesError} if the array values are arrays
 */
function noNestedArrays(arr) {
  if (Array.isArray(arr[0]) || Array.isArray(arr[1])) {
    throw new InvalidRangeValuesError();
  }
} // noNestedArrays

/**
 * Confirms that the array elements are numeric.
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {InvalidRangeValuesError} if the array values are not numeric
 */
function valuesAreNumeric(arr) {
  if (typeof arr[0] !== 'number' || typeof arr[1] !== 'number') {
    throw new InvalidRangeValuesError();
  }
} // noObjectsInRange

/**
 * Confirms that the second element in the array is greater than or equal to
 * the first element.
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {InvalidRangeValuesError} if the array elements are not in
 *  ascending order
 */
function arrayValuesAscend(arr) {
  if (arr[0] > arr[1]) {
    throw new InvalidRangeValuesError();
  }
} // arrayValuesAscend

/**
 * Custom validation rule for the status range fields confirms that value
 * provided is a two-element array, does not contain nested arrays, does not
 * contain objects, and its elements are in ascending order.
 *
 * @param {Array} arr - The array to test
 * @returns {undefined} - OK
 * @throws {InvalidRangeSizeError}
 * @throws {InvalidRangeValuesError}
 */
function validateStatusRange(arr) {
  /* seq v5: Custom validators defined per attribute now run when the
  attribute's value is null and allowNull is true */

  if (arr === null || arr === undefined) {
    return;
  }

  arrayHasTwoElements(arr);
  noNestedArrays(arr);
  valuesAreNumeric(arr);
  arrayValuesAscend(arr);
} // validateStatusRange

/**
 * Deletes all the sample entries related to an aspect. The following are
 * deleted:
 * 1. aspect from subject to aspect mappings
 * 2. aspect-to-subject mapping -> samsto:aspsubmap:aspectname
 * 3. sample entry in samsto:samples (samsto:samples:*|oldaspectname)
 * 4. sample hash samsto:samples:*|oldaspectname
 * @param {Object} aspect - aspect object
 * @param {Object} seq - The sequelize object
 * @returns {Promise} which resolves to the deleted samples.
 */
function removeAspectRelatedSamples(aspect, seq) {
  debugRemoveAspectRelatedSamples(aspect.name, 'Start');
  const now = new Date().toISOString();
  let samples = [];
  return redisOps.deleteSampleKeys(aspSubMapType, aspect.name)
  .tap((_samples) => {
    debugRemoveAspectRelatedSamples(aspect.name,
      `deleteSampleKeys (${_samples.length})`);
  })
  .then((_samples) => {
    samples = _samples;

    // get subjects from aspect-to-subject mapping for this aspect
    return redisOps.executeCommand(redisOps.getAspSubjMapMembers(aspect.name));
  })
  .tap((subjAbsPaths) => {
    debugRemoveAspectRelatedSamples(aspect.name,
      `getAspSubjMapMembers (${subjAbsPaths.length})`);
  })
  .then((subjAbsPaths) => redisOps.executeBatchCmds(
    redisOps.deleteAspectFromSubjectResourceMaps(subjAbsPaths, aspect.name)))
  .tap((n) => {
    debugRemoveAspectRelatedSamples(aspect.name,
      'deleteAspectFromSubjectResourceMaps');
  })
  .then(() => redisOps.deleteKey(aspSubMapType, aspect.name))
  .tap((n) => {
    debugRemoveAspectRelatedSamples(aspect.name, 'deleteKey');
  })
  .then(() => {
    const promises = [];

    // publish the samples only if the sequelize object seq is available
    if (seq && samples.length) {
      samples.forEach((sample) => {
        /*
         * publishSample attaches the subject and the aspect by fetching it
         * either from the database or redis. Deleted aspect will not be found
         * when called from the afterDestroy and afterUpdate hookes. So, attach
         * the aspect here before publishing the sample.
         */
        if (sample) {
          sample.updatedAt = now;
          promises.push(publishSample(sample, sampleEvent.del));
        }
      });
    }

    return Promise.all(promises);
  })
  .tap((n) => {
    debugRemoveAspectRelatedSamples(aspect.name, `publish (${n.length})`);
  });
} // removeAspectRelatedSamples

/**
 * Validate status range based on aspect value type
 * @param  {Array} statusRange  - Status Range
 * @param  {boolean|numeric|percent} aspValueType - aspect value type
 * @throws {object} Error InvalidAspectStatusRange if invalid range
 */
function validateRange(statusRange, aspValueType) {
  if (!statusRange) {
    return; // undefined status range is allowed
  }

  const statusRangeFirst = statusRange[0];
  const statusRangeSecond = statusRange[1];

  /*
  BOOLEAN value type ranges: [0, 0] or [1, 1]
  NUMERIC value type ranges: Number.MIN_SAFE_INTEGER to Number.MAX_SAFE_INTEGER
  PERCENT value type ranges: 0 to 100
   */
  if (aspValueType === aspValueTypes.boolean) {
    if (!((statusRangeFirst === 0 && statusRangeSecond === 0) ||
     (statusRangeFirst === 1 && statusRangeSecond === 1))) {
      throw new dbErrors.InvalidAspectStatusRange({
        message: `Value type: ${aspValueTypes.boolean} can only have ` +
        'ranges: [0,0] or [1,1]',
      });
    }
  } else if (aspValueType === aspValueTypes.numeric) {
    if (statusRangeFirst < Number.MIN_SAFE_INTEGER ||
      statusRangeSecond > Number.MAX_SAFE_INTEGER) {
      throw new dbErrors.InvalidAspectStatusRange({
        message: `Value type: ${aspValueTypes.numeric} can only have ranges ` +
        'with min value: -9007199254740991, max value: 9007199254740991',
      });
    }
  } else if (aspValueType === aspValueTypes.percent) {
    if (statusRangeFirst < 0 || statusRangeSecond > 100) {
      throw new dbErrors.InvalidAspectStatusRange({
        message: `Value type: ${aspValueTypes.percent} can only have ranges ` +
        'with min value: 0, max value: 100',
      });
    }
  }
}

/**
 * Validate all the status ranges of an aspect.
 * @param  {Object} inst - Aspect seq object
 * @throws {object} Error InvalidAspectStatusRange if any invalid range
 */
function validateAspectStatusRanges(inst) {
  const aspStatusRanges = [
    inst.criticalRange, inst.warningRange, inst.infoRange, inst.okRange,
  ];

  // Boolean value type allows only 2 different status ranges: [0,0] or [1,1]
  if (inst.valueType === aspValueTypes.boolean) {
    const definedBoolRanges = aspStatusRanges.filter((ar) => ar);
    if (definedBoolRanges.length > 2) {
      throw new dbErrors.InvalidAspectStatusRange({
        message: 'More than 2 status ranges cannot be assigned for value ' +
        'type: BOOLEAN',
      });
    }

    if (definedBoolRanges.length === 2 &&
      definedBoolRanges[0][0] === definedBoolRanges[1][0] &&
      definedBoolRanges[0][1] === definedBoolRanges[1][1]) {
      throw new dbErrors.InvalidAspectStatusRange({
        message: 'Same value range to multiple statuses is not allowed for ' +
        'value type: BOOLEAN',
      });
    }
  }

  aspStatusRanges.forEach((aspRange) => {
    validateRange(aspRange, inst.valueType);
  });
}

module.exports = {
  validateStatusRange,
  removeAspectRelatedSamples,
  aspValueTypes,
  validateAspectStatusRanges,
}; // exports
