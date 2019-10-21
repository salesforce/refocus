/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * cache/models/utils.js
 */
'use strict'; // eslint-disable-line strict

const apiConstants = require('../../api/v1/constants');
const defaults = require('../../config').api.defaults;
const sampleStore = require('../sampleStore');
const u = require('../../api/v1/helpers/verbs/utils');
const redisOps = require('../redisOps');
const Promise = require('bluebird');
const debugfindSamples = require('debug')('refocus:findSamples');
const MINUS_ONE = -1;
const ONE = 1;
const ZERO = 0;
const RADIX = 10;

/**
 * Apply field list filter.
 * @param  {Object} resource - The resource object
 * @param  {Array} attributes - Resource fields array
 */
function applyFieldListFilter(resource, attributes) {
  Object.keys(resource).forEach((field) => {
    if (!attributes.includes(field)) {
      delete resource[field];
    }
  });
}

/**
 * Determines if the options have filters on fields other than "name"
 *
 * @param  {Object} opts - Filter options
 * @returns {Boolean} - true if filtered
 */
function applyLimitAndOffsetInPrefilter(opts) {
  const filters = Object.keys(opts.filter);
  const onlyName = filters.length === 1 && filters[0] === 'name';
  return !opts.order && (!filters.length || onlyName);
}

/**
 * Apply limit and offset filter to resource array.
 *
 * @param  {Object} opts - Filter options
 * @param  {Array} arr - Array of resource keys or objects
 * @returns {Array} - Sliced array
 */
function applyLimitAndOffset(opts, arr) {
  const startIndex = opts.offset || 0;
  const endIndex = startIndex + opts.limit || arr.length;

  // Short circuit: avoid calling array slice if we don't have to!
  if (startIndex === 0 && endIndex >= arr.length) {
    return arr;
  }

  return arr.slice(startIndex, endIndex);
}

/**
 * Apply filters on sample objects.
 *
 * @param  {Array} sampleArray - Sample array
 * @param  {Object} opts - Filter options
 * * @param  {boolean} hasNameFilterOnly - True if opts has name filter only
 * @returns {Array} - Filtered sample array
 */
function applyFiltersOnSampleObjs(sampleArray, opts) {
  debugfindSamples('entered applyFiltersOnSampleObjs. Sample array size: %d',
    sampleArray.length);
  let filtered = sampleArray;

  if (opts.filter) {
    const filterOptions = opts.filter;
    debugfindSamples('filter by field wildcard expr (except name): %o',
      filterOptions);
    Object.keys(filterOptions).forEach((field) => {
      const value = filterOptions[field];
      if (field !== 'name' && typeof field === 'string') {
        filtered = filterByFieldWildCardExpr(filtered, field, value);
      }
    });
  }

  const hasNameFilterOnly = Object.keys(opts.filter).length === 1 &&
    opts.filter.name;
  const sortByNameOnly = opts.order &&
    (opts.order === ['name'] || opts.order === ['-name']);

  // If sorting was not applied on keys, sort and apply limit/offset
  if (!hasNameFilterOnly || !sortByNameOnly) {
    if (opts.order) {
      filtered = sortByOrder(filtered, opts.order);
    } else {
      filtered = sortByOrder(filtered, ['name']);
    }

    filtered = applyLimitAndOffset(opts, filtered);
    debugfindSamples('After sort and applying limit/offset. Number of ' +
      'samples: %d', filtered.length);
  }

  return filtered;
} // applyFiltersOnSampleObjs

/**
 * Apply filters on resource array list.
 *
 * @param  {Array} resourceObjArray - Resource objects array
 * @param  {Object} opts - Filter options
 * @returns {Array} - Filtered resource objects array
 */
function applyFiltersOnResourceObjs(resourceObjArray, opts) {
  let filtered = resourceObjArray;

  // apply wildcard expr if other than name because
  // name filter was applied before redis call
  if (opts.filter) {
    const filterOptions = opts.filter;
    Object.keys(filterOptions).forEach((field) => {
      const value = filterOptions[field];
      if (field === 'isPublished') {
        filtered = filterByIsPublished(filtered, value);
      } else if (field === 'tags') {
        filtered = filterByTags(filtered, value);
      } else if (field !== 'name' && typeof field === 'string') {
        filtered = filterByFieldWildCardExpr(filtered, field, value);
      }
    });
  }

  // sort resources
  if (opts.order) {
    filtered = sortByOrder(filtered, opts.order);
  }

  // apply limits to resources if not already applied in prefilterKeys
  if (!applyLimitAndOffsetInPrefilter(opts)) {
    filtered = applyLimitAndOffset(opts, filtered);
  }

  return filtered;
} // applyFiltersOnResourceObjs

/**
 * Get sample keys using subaspmap and aspsubmap
 * @param {string} subjectAspExpr - sample name string with wildcard
 * @param {boolean} hasSubjectName - boolean
 * @returns {Promise} Resulting in matching sample keys
 */
function getSampleKeysUsingMaps(subjectAspExpr, hasSubjectName) {
  const subjStr = subjectAspExpr[0];
  const aspStr = subjectAspExpr[1];
  const sampleKeysArr = [];

  // assume get from aspSubMap
  let wildCardExpr = subjStr;
  let getMapMembers = redisOps.getAspSubjMapMembers(aspStr);

  if (hasSubjectName) {
    wildCardExpr = aspStr;
    getMapMembers = redisOps.getSubjAspMapMembers(subjStr);
  }

  debugfindSamples('redis: %o', getMapMembers);
  return getMapMembers
    .then((items) => {
      const re = regexToMatchWildcards(wildCardExpr);
      items.forEach((item) => {
        if (re.test(item)) {
          let sampName;
          if (hasSubjectName) {
            sampName = `samsto:sample:${subjStr}|${item}`;
          } else {
            sampName = `samsto:sample:${item}|${aspStr}`;
          }

          sampleKeysArr.push(sampName);
        }
      });

      debugfindSamples('matched samples size: %d', sampleKeysArr.length);
      return sampleKeysArr;
    });
}

/**
 * Filter sample keys by name
 * If there is a wildcard in sample name, for either the subject or aspect part
 * of the sample name, we use subaspmap and/or aspsubmap to get the list of
 * sample.
 * @param  {Array} sampleKeys - Sample names array
 * @param  {Object} opts - Filter options
 * @returns {Array} - Filtered sample keys array
 */
function filterSampleKeysByName(sampleKeys, opts) {
  const namefilterValues = opts.filter.name.split(',').map((n) => n.trim());

  return namefilterValues.map((filterVal) => {
    const sampArr = filterByFieldWildCardExpr(sampleKeys, 'name', filterVal);
    return sampArr;
  }).reduce((a, b) => [...a, ...b]);
} // filterSampleKeysByName

/**
 * Do any prefiltering based on the keys.
 *
 * @param  {Array} keysArr - Resource key names array
 * @param  {Object} opts - Filter options
 * @param  {Function} getNameFunc - For filter on name, any processing
 *  on keys to get the resource name.
 * @returns {Array} - Filtered resource keys array
 */
function prefilterKeys(keysArr, opts, getNameFunc) {
  let resArr = keysArr;

  // apply wildcard expr on name, if specified
  if (opts.filter && opts.filter.name) {
    const filteredKeys = filterByFieldWildCardExpr(resArr, 'name',
      opts.filter.name, getNameFunc);
    resArr = filteredKeys;
  }

  // apply limit and offset now if possible
  if (applyLimitAndOffsetInPrefilter(opts)) {
    resArr = applyLimitAndOffset(opts, resArr);
  }

  return resArr;
} // prefilterKeys

/**
 * Remove attributes from the object which are not specified in the array.
 * Note: this updates the object "in place".
 *
 * @param  {Object} obj - the original object
 * @param  {Array} attributesToKeep - Array of attribute names to keep
 * @returns {Object} new object with all the extra attributes from the original
 *  object stripped out
 */
function removeExtraAttributes(obj, attributesToKeep) {
  Object.keys(obj)
  .filter((key) => !attributesToKeep.includes(key))
  .forEach((key) => delete obj[key]);
} // removeExtraAttributes

/**
 * Apply isPublished filter on resource array of objects.
 *
 * @param  {Array}  arr - Array of objects to filter
 * @param  {Boolean} value - value to filter by
 * @returns {Array} - Filtered array
 */
function filterByIsPublished(arr, value) {
  return arr.filter((obj) => obj.isPublished === value);
}

/**
 * Apply tags filter on resource array of objects.
 *
 * @param  {Array}  arr - Array of objects to filter
 * @param  {Array} tags - Array of tags to filter by
 * @returns {Array} - Filtered array
 */
function filterByTags(arr, tags) {
  /*
   * If !INCLUDE, splice out the leading "-" in tags. Otherwise throw an
   * exception if tag starts with "-".
   */
  const INCLUDE = !tags[0].startsWith('-');
  tags.forEach((tag, i) => {
    if (tag.startsWith('-')) {
      if (INCLUDE) {
        throw new Error('To specify EXCLUDE tags, prepend each tag with -');
      } else {
        tags[i] = tags[i].slice(ONE);
      }
    }
  });

  /*
   * If INCLUDE, return objects that include all specified tags.
   * If EXCLUDE, return objects that include none of the specified tags.
   */
  if (INCLUDE) {
    return arr.filter((obj) =>
      tags.every((tag) => obj.tags.includes(tag))
    );
  } else {
    return arr.filter((obj) =>
      tags.every((tag) => !obj.tags.includes(tag))
    );
  }
}

/**
 * Regex to match wildcard expression with *
 * @param {String} propExpr - Wildcard expression
 * @returns {RegExp} - Regex
 */
function regexToMatchWildcards(propExpr) {
  // regex to match wildcard expr, i option means case insensitive
  const escapedExp = propExpr.split('_').join('\\_')
    .split('|').join('\\|').split('.').join('\\.');

  const re = new RegExp('^' + escapedExp.split('*').join('.*') + '$', 'i');
  return re;
}

/**
 * Apply wildcard filter on resource array of keys or objects. For each entry,
 * if given property exists for resource, apply regex to the property value,
 * else if, the property is 'name', then the function was called before getting
 * obj, hence apply regex filter on resource name.
 * @param  {Array}  arr - Array of resource keys or resource objects
 * @param  {String}  prop  - Property name
 * @param  {String} propExpr - Wildcard expression
 * @param  {Function} getNameFunc - For filter on name, any processing
 *  on keys to get the resource name.
 * @returns {Array} - Filtered array
 */
function filterByFieldWildCardExpr(arr, prop, propExpr, getNameFunc) {
  const re = regexToMatchWildcards(propExpr);
  return arr.filter((entry) => {
    if (entry[prop]) { // resource object
      return re.test(entry[prop]);
    } else if (prop === 'name') { // resource key
      const _name = sampleStore.getNameFromKey(entry);

      // keys may need processing to become names
      const name = getNameFunc ? getNameFunc(_name) : _name;
      return re.test(name);
    }

    return false;
  });
}

/**
 * Sort by appending all fields value in a string and then comparing them.
 * If first fields starts with -, sort order is descending.
 * @param  {Array} arr - Resource objs array
 * @param  {Array} propArr - Fields array
 * @returns {Array} - Sorted array
 */
function sortByOrder(arr, propArr) {
  const isDescending = propArr[ZERO].startsWith('-');
  return arr.sort((a, b) => {
    let strA = '';
    let strB = '';
    propArr.forEach((field) => {
      // remove leading minus sign
      const _field = isDescending ? field.substr(1) : field;
      strA += a[_field];
      strB += b[_field];
    });

    if (strA < strB) {
      return isDescending ? ONE : MINUS_ONE;
    }

    if (strA > strB) {
      return isDescending ? MINUS_ONE : ONE;
    }

    return ZERO;
  });
} // sortByOrder

/**
 * Get option fields from request parameters. An example:
 * { attributes: [ 'name', 'status', 'value', 'id' ],
    order: [ '-value', 'status' ],
    limit: 5,
    offset: 1,
    filter: { name: '___Subject1.___Subject2*' } }
 * @param  {Object} params - Request query parameters
 * @param  {Object} helper - The resource's properties.
 * @returns {Object} - Filter object
 */
function getOptionsFromReq(params, helper) {
  // eg. ?fields=x,y,z. Adds as opts.attributes = [array of fields]
  // id is always included
  const opts = u.buildFieldList(params, helper);

  // Specify the sort order. If defaultOrder is defined in props or sort value
  // then update sort order otherwise take value from model defination
  if ((params.sort && params.sort.value) || helper.defaultOrder) {
    opts.order = params.sort.value || helper.defaultOrder;
  }

  // Specify the limit (must not be greater than default)
  opts.limit = defaults.limit;
  if (params.limit && params.limit.value) {
    const lim = parseInt(params.limit.value, RADIX);
    if (lim < defaults.limit) {
      opts.limit = lim;
    }
  }

  opts.offset = defaults.offset;
  if (params.offset && params.offset.value) {
    opts.offset = parseInt(params.offset.value, RADIX);
  }

  const filter = {};
  const keys = Object.keys(params);

  for (let i = ZERO; i < keys.length; i++) {
    const key = keys[i];
    const isFilterField = apiConstants.NOT_FILTER_FIELDS.indexOf(key) < ZERO;
    if (isFilterField && params[key].value !== undefined) {
      filter[key] = params[key].value;
    }
  }

  opts.filter = filter;
  return opts;
}

module.exports = {
  applyFieldListFilter,
  applyFiltersOnSampleObjs,
  applyLimitAndOffset,
  filterByFieldWildCardExpr,
  getOptionsFromReq,
  filterSampleKeysByName,
  removeExtraAttributes,
  sortByOrder,
  prefilterKeys,
  applyFiltersOnResourceObjs,
  getSampleKeysUsingMaps,
};
