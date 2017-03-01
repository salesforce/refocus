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
const u = require('../../../../utils/filters');
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
 * Prune a node by applying filters to it.
 *
 * @param {Object} res - Node to be pruned
 * @returns {Integer} - Returns zero only if the filters is set and all the
 *  samples are filtered.
 */
function pruneNode(res) {
  const filteredSamples = [];
  const filterOnSubject = u.applyTagFilters(res.tags, 'subjectTags', filters);
  if (filterOnSubject) {
    for (let i = 0; i < res.samples.length; i++) {
      if (res.samples[i].aspect) {
        if (u.applyFilters(res.samples[i].aspect.name, 'aspect', filters) &&
          u.applyTagFilters(res.samples[i].aspect.tags,
            'aspectTags', filters) &&
          u.applyFilters(res.samples[i].status, 'status', filters)) {
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
      u.setFilters(params, filters);
      traverseHierarchy(res);
      u.resetFilters(filters);
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
