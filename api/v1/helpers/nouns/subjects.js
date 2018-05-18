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
'use strict'; // eslint-disable-line strict

const Subject = require('../../../../db/index').Subject;
const m = 'subject';
const fieldsWithJsonArrayType = ['relatedLinks'];
const fieldsWithArrayType = ['tags'];

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
    hierarchy: 'hierarchy',
    user: 'user',
  },
  model: Subject,
  modelName: 'Subject',
  nameFinder: 'absolutePath',

  // define the associations that are to be deleted here
  belongsToManyAssoc: {
    users: 'writers',
  },
  fieldsWithJsonArrayType,
  fieldsWithArrayType,
  tagFilterName: 'tags',
  readOnlyFields: [
    'hierarchyLevel', 'absolutePath', 'childCount', 'id', 'isDeleted',
  ],
  requireAtLeastOneFields: ['helpEmail', 'helpUrl'],
}; // exports
