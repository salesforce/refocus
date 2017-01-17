/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/perspectives.js
 */
'use strict'; // eslint-disable-line strict

const Perspective = require('../../../../db/index').Perspective;
const featureToggles = require('feature-toggles');
const apiErrors = require('../../apiErrors');

const m = 'perspective';
const filters = ['aspectFilter',
                  'subjectTagFilter',
                  'aspectTagFilter',
                  'statusFilter',
                ];

/**
 * Validates the perspective request body and returns false when any of the
 * filter has an empty includes. ie INCLUDE = []
 * @param  {Object} o - A perspective request body object.
 * @returns {Boolean} returns the  false if the validation fails.
 */
function validateFilter(o) {
  for (let i = 0; i < filters.length; i++) {
    if (o[filters[i] + 'Type'] === 'INCLUDE' &&
      (!o[filters[i]] || !o[filters[i]].length)) {
      return false;
    }
  }

  return true;
}

/**
 * Calls validateFilter function and throws an error only if the validation
 * fails
 * @param  {Object} o - A perspective request body object.
 */
function validateFilterAndThrowError(o) {
  if (!validateFilter(o)) {
    throw new apiErrors.InvalidPerspectiveError();
  }
}

module.exports = {
  apiLinks: {
    DELETE: `Delete this ${m}`,
    GET: `Retrieve this ${m}`,
    PATCH: `Update selected attributes of this ${m}`,
    POST: `Create a new ${m}`,
    PUT: `Overwrite all attributes of this ${m}`,
  },
  baseUrl: '/v1/perspectives',
  fieldAbsenceScopeMap: {
    lens: 'withoutLensAssociation',
  },
  model: Perspective,
  modelName: 'Perspective',
  validateFilterAndThrowError,

  // define the associations that are to be deleted here
  belongsToManyAssoc: {
    users: 'writers',
  },
  cacheEnabled: featureToggles.isFeatureEnabled('enableCachePerspective'),
}; // exports
