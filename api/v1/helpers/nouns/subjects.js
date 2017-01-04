/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/subjects.js
 */
'use strict';

const Subject = require('../../../../db/index').Subject;
const constants = require('../../constants');
const m = 'subject';
const config = require('../../../../config');

/*
 * All the query params that can be expected in the hierarchy endpoint are
 * defined as a key. The values of the query parameters are later added to them
 * by the set filters function
 */
const filters = {
  aspect: {},
  subjectTags: {},
  aspectTags: {},
  status: {},
};

const fieldsWithJsonArrayType = ['relatedLinks'];
const fieldsWithArrayType = ['tags'];
const loggingEnabled = (
  config.auditSubjects === 'API' || config.auditSubjects === 'ALL'
  ) || false;

/**
 * Recursive function to prune children from a subject in order to return a
 * subject hierarchy with the specified depth.
 *
 * @param {Instance} parent - The subject whose children may be deleted
 * @param {Integer} depth - The number of generations remaining to delete
 * @returns {Instance} parent - The updated subject
 */
function deleteChildren(parent, depth) {
  if (parent.children) {
    if (depth === 1) {
      for (let i = 0; i < parent.children.length; i++) {
        delete parent.children[i].children;
      }
    } else if (depth > 1) {
      for (let i = 0; i < parent.children.length; i++) {
        deleteChildren(parent.children[i], depth - 1);
      }
    }
  }

  return parent;
} // deleteChildren

/**
 * Sets the filters object defined at the top. All the query params which can
 * be expected in the hierarchy endpoint are defined as a key in the "filter"
 * object above. For each of the keys defined in the filters object, this
 * function parses the query params and sets the includes and excludes
 * fields of the object.
 *
 * @param {Object} params - The query parameters in the request along with its
 *  values
 */
function setFilters(params) {
  for (const key in filters) {
    if (params[key] && params[key].value) {
      const arr = params[key].value.split(constants.FILTER_DELIMITER);
      filters[key].includes = new Set();
      filters[key].excludes = new Set();
      for (const i in arr) {
        if (arr[i].charAt(0) === constants.FILTER_NEGATION) {
          filters[key].excludes.add(arr[i].substr(1).toLowerCase());
        } else {
          filters[key].includes.add(arr[i].toLowerCase());
        }
      }
    }
  }
} // setFilters

/**
 * Resets the filter object and its properties to null.
 */
function resetFilters() {
  for (const key in filters) {
    if (key) {
      filters[key].includes = null;
      filters[key].excludes = null;
    }
  }
} // resetFilters

/**
 * Applies one of the filters defined in the "filters" object to the entity
 * array.
 *
 * @param {Array} keys - The array on which the filters will be
 *  applied, e.g. if filtering by subject tags, keys should be the
 *  subject.tags field of the subject model
 * @param {String} filterBy - If filtering by subject tags the key would be
 *  the query param "subjecttags".
 * @returns {Boolean} - Returns true if the filter criteria is matched.
 */
function applyTagFilters(keys, filterBy) {
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
 * for eg .. if filtering by aspect name. entity should be an "aspect name"
 * like "aspect1"
 * @param  {String} filterBy - The filter that is to be applied. For eg.. if
 * filtering by aspect name . key is 'aspect'. This should be one of the
 * properties of the filters object.
 *
 * @returns {Boolean} - Returns true if the filter criteria is matched.
 */
function applyFilters(key, filterBy) {
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

/**
 * Prune a node by applying filters to it.
 *
 * @param {Object} res - Node to be pruned
 * @returns {Integer} - Returns zero only if the filters is set and all the
 *  samples are filtered.
 */
function pruneNode(res) {
  const filteredSamples = [];
  const filterOnSubject = applyTagFilters(res.tags, 'subjectTags');
  if (filterOnSubject) {
    for (let i = 0; i < res.samples.length; i++) {
      if (res.samples[i].aspect) {
        if (applyFilters(res.samples[i].aspect.name, 'aspect') &&
          applyTagFilters(res.samples[i].aspect.tags, 'aspectTags') &&
          applyFilters(res.samples[i].status, 'status')) {
          filteredSamples.push(res.samples[i]);
        }
      }
    }
  }

  res.samples = filteredSamples;

  /*
   * filterOnSubject: returns true(integer > 0) only if the subjecttags are not
   *   set or if the subjecttags are set and the subject node passes the
   *   subjecttags filter condition
   * res.samples.length: returns true (length > 0) only if filterOnSubject is
   *   true and the samples have passed the aspect, aspectTags and the sample
   *   status filter condition.
   * filters.aspect.includes/filters.aspectTags.includes/filters.status
   *    .includes: are each true only if they are not set. Check on this is
   *    done so that we can return subjects without samples too.
   */
  return (filterOnSubject && (res.samples.length || (!filters.aspect.includes &&
    !filters.aspectTags.includes && !filters.status.includes)));
} // pruneNode

/**
 * This recursive function does a bottom up traversal of the hierarchy tree. At
 * each child (node) of the hierarchy, it passes the child node to a set of
 * filters (pruned) to check if it should still be included in the hierarchy.
 * The filters are constructued using the query parameters in the request url.
 * If a child is included in the hierarchy, its parent is also included.
 *
 * @param {ServerResponse} res - The subject response
 * @returns {Integer} - 0 if this node was filtered out, i.e. it should not be
 *  part of the final hierarchy tree.
 */
function traverseHierarchy(res) {
  const filteredChildrenArr = [];
  if (res.children) {
    for (let i = 0; i < res.children.length; i++) {
      if (traverseHierarchy(res.children[i])) {
        filteredChildrenArr.push(res.children[i]);
      }
    }

    // filtered array is attached to the children key
    res.children = filteredChildrenArr;
  }

  // return 0 only if both filteredChildrenArr.length and pruneNode return zero
  return pruneNode(res) || filteredChildrenArr.length;
} // traverseHierarchy

/**
 * Check if any of the query params for the hierarchy endpoint are set. If so,
 * call setFilter to set the filter based on the query param and call
 * traverseHierarchy to traverse and prune it.
 *
 * @param {ServerResponse} res - The subject response containing the samples
 *  and children as an array
 * @param {Object} params - The query parameters in the request along with its
 *  values
 * @returns {ServerResponse} res - The modified subject response
 */
function modifyAPIResponse(res, params) {
  for (const key in filters) {
    if (key && params[key].value) {
      setFilters(params);
      traverseHierarchy(res);
      resetFilters();
      break;
    }
  }

  return res;
} // modifyAPIResponse

module.exports = {
  apiLinks: {
    DELETE: `Delete this ${m}`,
    GET: `Retrieve this ${m}`,
    PATCH: `Update selected attributes of this ${m}`,
    POST: `Create a new ${m}`,
    PUT: `Overwrite all attributes of this ${m}`,
  },
  baseUrl: '/v1/subjects',
  deleteChildren,
  fieldScopeMap: {
    samples: 'withSamples',
    hierarchy: 'hierarchy',
  },
  model: Subject,
  modelName: 'Subject',
  nameFinder: 'absolutePath',

  // define the associations that are to be deleted here
  belongsToManyAssoc: {
    users: 'writers',
  },
  modifyAPIResponse,
  fieldsWithJsonArrayType,
  fieldsWithArrayType,
  loggingEnabled,
  tagFilterName: 'tags',
}; // exports
