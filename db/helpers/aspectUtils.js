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

const InvalidRangeValuesError = require('../dbErrors').InvalidRangeValuesError;
const InvalidRangeSizeError = require('../dbErrors').InvalidRangeSizeError;

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
  arrayHasTwoElements(arr);
  noNestedArrays(arr);
  valuesAreNumeric(arr);
  arrayValuesAscend(arr);
} // validateStatusRange

module.exports = {
  validateStatusRange,
}; // exports
