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
const u = require('../../api/v1/helpers/verbs/utils');
const featureToggles = require('feature-toggles');
const redisErrors = require('../redisErrors');
const MINUS_ONE = -1;
const ONE = 1;
const ZERO = 0;
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
      strA += a[field];
      strB += b[field];
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

module.exports = {
  applyLimitAndOffset,
  checkWritePermission,
  getOptionsFromReq,
  sortByOrder,
}
