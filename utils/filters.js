
/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * utils/filters.js
 */
'use strict'; // eslint-disable-line strict

const FILTER_DELIMITER = ',';
const FILTER_NEGATION = '-';

/**
 * Sets the filters object defined at the top. All the query params which can
 * be expected in the hierarchy endpoint are defined as a key in the "filter"
 * object above. For each of the keys defined in the filters object, this
 * function parses the query params and sets the includes and excludes
 * fields of the object.
 *
 * @param {Object} params - The query parameters in the request along with its
 *  values
 *  @param {Object} filters - The filter object which needs to be set based on
 *  the query params
 *  @returns {Object} - the filter object that is set based on the query param
 */
function setFilters(params, filters) {
  for (const key in filters) {
    if (params[key] && params[key].value) {
      const arr = params[key].value.split(FILTER_DELIMITER);
      filters[key].includes = new Set();
      filters[key].excludes = new Set();
      for (const i in arr) {
        if (arr[i].charAt(0) === FILTER_NEGATION) {
          filters[key].excludes.add(arr[i].substr(1).toLowerCase());
        } else {
          filters[key].includes.add(arr[i].toLowerCase());
        }
      }
    }
  }

  return filters;
} // setFilters

/**
 * Resets the filter object and its properties to null.
 * @param {Object} filters - The filter object
 * @returns {Object} - the filter object, with all the filters reset
 */
function resetFilters(filters) {
  for (const key in filters) {
    if (key) {
      filters[key].includes = null;
      filters[key].excludes = null;
    }
  }

  return filters;
} // resetFilters

/**
 * Applies one of the filters defined in the "filters" object to the entity
 * array.
 *
 * @param {Array} keys - The array on which the filters will be
 *  applied, e.g. if filtering by subject tags, keys should be the
 *  subject.tags field of the subject model
 * @param {String} filterBy - If filtering by subject tags the key would be
 *  the query param "subjectTags".
 *  @param {Object} filters - The filter object based on which the filters are
 *   applied
 * @returns {Boolean} - Returns true if the filter criteria is matched.
 */
function applyTagFilters(keys, filterBy, filters) {
  // when a filter is not set, return true.
  if (!filters[filterBy].includes || !filters[filterBy].excludes) {
    return true;
  }

  // When tags are not present and an excludes filter is set, return true
  if (!keys.length && filters[filterBy].excludes.size) {
    return true;
  }

  let isPartOfInFilter = false;
  let isPartOfNotInFilter = false;

  // check if the elements of keys are part of the "includes" filter
  for (let i = 0; i < keys.length; i++) {
    if (filters[filterBy].includes.has(keys[i].toLowerCase())) {
      isPartOfInFilter = true;
      break;
    }
  }

  // check if the elements of keys are part of the "excludes" filter
  for (let i = 0; i < keys.length; i++) {
    if (filters[filterBy].excludes.has(keys[i].toLowerCase())) {
      isPartOfNotInFilter = true;
      break;
    }
  }

  /*
   * If the excludes filter clause is set and if no elements of the keys array
   * were a part of the excludes filter, return true.
   */
  if (filters[filterBy].excludes.size && !isPartOfNotInFilter) {
    return true;
  }

  /*
   * If atleast one element of the keys array were a part of the includes filter
   * return true
   */
  if (isPartOfInFilter) {
    return true;
  }

  return false;
} // applyTagFilters

/**
 * Applies one of the filters defined in the "filters" object
 * to the entity.
 *
 * @param  {String} key - The key on which the filters are to be applied.
 *  for eg .. if filtering by aspect name. entity should be an "aspect name"
 *  like "aspect1"
 * @param  {String} filterBy - The filter that is to be applied. For eg.. if
 *  filtering by aspect name , this should be 'aspect'.
 * @param {Object} filters - The filter object based on which the filters are
 *   applied
 * @returns {Boolean} - Returns true if the filter criteria is matched.
 */
function applyFilters(key, filterBy, filters) {
  // When a filter is not set return true
  if (!filters[filterBy].includes || !filters[filterBy].excludes) {
    return true;
  }

  /*
   * If the excludes filter clause is set and if the entity is not present
   * in this filter return true.
   */
  if (filters[filterBy].excludes.size &&
        !filters[filterBy].excludes.has(key.toLowerCase())) {
    return true;
  }

  // If the entity is present in the includes filter clause return true.
  if (filters[filterBy].includes.has(key.toLowerCase())) {
    return true;
  }

  return false;
} // applyFilters

module.exports = {
  applyFilters,

  applyTagFilters,

  setFilters,

  resetFilters,

}; // exports
