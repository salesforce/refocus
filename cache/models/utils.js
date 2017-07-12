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
const apiConstants = require('../../api/v1/constants');
const defaults = require('../../config').api.defaults;
const sampleStore = require('../sampleStore');
const u = require('../../api/v1/helpers/verbs/utils');
const featureToggles = require('feature-toggles');
const redisErrors = require('../redisErrors');
const MINUS_ONE = -1;
const ONE = 1;
const ZERO = 0;

/**
 * Apply field list filter.
 * @param  {Object} sample - Sample object
 * @param  {Array} attributes - Sample fields array
 */
function applyFieldListFilter(sample, attributes) {
  // apply field list filter
  Object.keys(sample).forEach((sampField) => {
    if (!attributes.includes(sampField)) {
      delete sample[sampField];
    }
  });
}

/**
 * Apply filters on sample array list
 * @param  {Array} resourceObjArray - Sample objects array
 * @param  {Object} opts - Filter options
 * @returns {Array} - Filtered sample objects array
 */
function applyFiltersOnSampObjs(resourceObjArray, opts) {
  let filteredResources = resourceObjArray;

  // apply wildcard expr if other than name because
  // name filter was applied before redis call
  if (opts.filter) {
    const filterOptions = opts.filter;
    Object.keys(filterOptions).forEach((field) => {
      if (field !== 'name' || field !== 'absolutePath') {
        const filteredKeys = filterByFieldWildCardExpr(
          resourceObjArray, field, filterOptions[field]
        );
        filteredResources = filteredKeys;
      }
    });
  }

  // sort and apply limits to samples
  if (opts.order) {
    console.log(opts.order)
    const sortedSamples = sortByOrder(filteredResources, opts.order);
    console.log('output', sortedSamples)
    filteredResources = sortedSamples;

    const slicedSampObjs = applyLimitAndOffset(opts, filteredResources);
    filteredResources = slicedSampObjs;
  }

  return filteredResources;
}

/**
 * Apply limit and offset filter to resource array
 * @param  {Object} opts - Filter options
 * @param  {Array} arr - Array of resource keys or objects
 * @returns {Array} - Sliced array
 */
function applyLimitAndOffset(opts, arr) {
  let startIndex = 0;
  let endIndex = arr.length;
  if (opts.offset) {
    startIndex = opts.offset;
  }

  if (opts.limit) {
    endIndex = startIndex + opts.limit;
  }

  // apply limit and offset, default 0 to length
  return arr.slice(startIndex, endIndex);
}

/**
 * Apply filters on sample keys list
 * @param  {Array} sampKeysArr - Sample key names array
 * @param  {Object} opts - Filter options
 * @returns {Array} - Filtered sample keys array
 */
function applyFiltersOnSampKeys(sampKeysArr, opts) {
  let resArr = sampKeysArr;

  // apply limit and offset if no sort order defined
  if (!opts.order) {
    resArr = applyLimitAndOffset(opts, sampKeysArr);
  }

  // apply wildcard expr on name, if specified
  if (opts.filter && opts.filter.name) {
    const filteredKeys = filterByFieldWildCardExpr(
      resArr, 'name', opts.filter.name
    );
    resArr = filteredKeys;
  }

  return resArr;
}


/**
 * Remove extra fields from query body object.
 * @param  {Object} qbObj - Query body object
 * @param  {Array} fieldsArr - Array of field names
 */
function cleanQueryBodyObj(qbObj, fieldsArr) {
  Object.keys(qbObj).forEach((qbField) => {
    if (!fieldsArr.includes(qbField)) {
      delete qbObj[qbField];
    }
  });
}

/**
 * Apply wildcard filter on sample array of keys or objects. For each entry,
 * if given property exists for sample, apply regex to the property value,
 * else if, the property is 'name', then the function was called before getting
 * obj, hence apply regex filter on sample name.
 * @param  {Array}  sampArr - Array of sample keys or sample objects
 * @param  {String}  prop  - Property name
 * @param  {String} propExpr - Wildcard expression
 * @returns {Array} - Filtered array
 */
function filterByFieldWildCardExpr(sampArr, prop, propExpr) {
  // regex to match wildcard expr, i option means case insensitive
  const escapedExp = propExpr.split('_').join('\\_')
                      .split('|').join('\\|').split('.').join('\\.');

  const re = new RegExp('^' + escapedExp.split('*').join('.*') + '$', 'i');
  return sampArr.filter((sampEntry) => {
    if (sampEntry[prop]) { // sample object
      return re.test(sampEntry[prop]);
    } else if (prop === 'name') { // sample key
      const sampName = sampleStore.getNameFromKey(sampEntry);
      return re.test(sampName);
    }

    return false;
  });
}

/**
 * Checks if the user has the permission to perform the write operation on the
 * sample or not
 * @param  {String}  aspect - Aspect object
 * @param  {String}  sample - Sample object
 * @param  {String}  userName -  User performing the operation
 * @param  {Boolean} isBulk   - Flag to indicate if the action is a bulk
 * operation or not
 * @returns {Promise} - which resolves to true if the user has write permission
 */
function checkWritePermission(aspect, sample, userName, isBulk) {
  let isWritable = true;
  if (aspect.writers && aspect.writers.length) {
    isWritable = featureToggles
                        .isFeatureEnabled('enforceWritePermission') ?
                        aspect.writers.includes(userName) : true;
  }

  if (!isWritable) {
    const err = new redisErrors.UpdateDeleteForbidden({
      explanation: `The user: ${userName}, does not have write permission` +
        ` on the sample: ${sample.name}`,
    });
    if (isBulk) {
      return Promise.reject({ isFailed: true, explanation: err });
    }

    return Promise.reject(err);
  }

  return Promise.resolve(true);
} // checkWritePermission

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
      const _field = isDescending ? field.substr(1): field;
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
}

/**
 * Get option fields from requesr parameters. An example:
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
  const opts = u.buildFieldList(params);

  // Specify the sort order. If defaultOrder is defined in props or sort value
  // then update sort order otherwise take value from model defination
  if ((params.sort && params.sort.value) || helper.defaultOrder) {
    opts.order = params.sort.value || helper.defaultOrder;
  }

  // handle limit
  if (params.limit && params.limit.value) {
    opts.limit = parseInt(params.limit.value, defaults.limit);
  }

  // handle offset
  if (params.offset && params.offset.value) {
    opts.offset = parseInt(params.offset.value, defaults.offset);
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
  applyFiltersOnSampObjs,
  cleanQueryBodyObj,
  filterByFieldWildCardExpr,
  applyFieldListFilter,
  applyFiltersOnSampKeys,
  applyLimitAndOffset,
  checkWritePermission,
  getOptionsFromReq,
  sortByOrder,
}
