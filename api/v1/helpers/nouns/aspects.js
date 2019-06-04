/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/aspects.js
 */
'use strict'; // eslint-disable-line strict

const Aspect = require('../../../../db/index').Aspect;
const m = 'aspect';
const fieldsWithJsonArrayType = ['relatedLinks'];
const fieldsWithArrayType = ['tags'];
const fieldsWithEnum = ['valueType'];

module.exports = {
  apiLinks: {
    DELETE: `Delete this ${m}`,
    GET: `Retrieve this ${m}`,
    PATCH: `Update selected attributes of this ${m}`,
    POST: `Create a new ${m}`,
    PUT: `Overwrite all attributes of this ${m}`,
  },
  baseUrl: '/v1/aspects',
  model: Aspect,
  modelName: 'Aspect',

  // define the associations that are to be deleted here
  belongsToManyAssoc: {
    users: 'writers',
  },
  fieldsWithArrayType,
  fieldsWithJsonArrayType,
  fieldsWithEnum,
  fieldScopeMap: {
    user: 'user',
    owner: 'owner',
  },
  fieldsToExclude: ['createdBy', 'ownerId'],
  tagFilterName: 'tags',
  readOnlyFields: ['id'],
  requireAtLeastOneFields: ['helpEmail', 'helpUrl'],
  timePeriodFilters: ['createdAt', 'updatedAt'],
}; // exports
