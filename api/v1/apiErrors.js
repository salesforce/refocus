/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/apiErrors.js
 *
 * API Error Definitions
 */
'use strict';

const apiErrors = require('errors');

apiErrors.create({
  code: 11010,
  name: 'RefocusApiError',
});

// ----------------------------------------------------------------------------
// Validation Errors
// ----------------------------------------------------------------------------
apiErrors.create({
  code: 11100,
  status: 400,
  name: 'ValidationError',
  parent: apiErrors.RefocusApiError,
  fields: [],
});

apiErrors.create({
  code: 11102,
  status: 400,
  name: 'InvalidTokenActionError',
  parent: apiErrors.ValidationError,
  fields: [],
  defaultMessage: 'You are not allowed to restore a token if it was not ' +
    'previously revoked, and vice versa.',
});

apiErrors.create({
  code: 11103,
  status: 400,
  name: 'DuplicateFieldError',
  parent: apiErrors.ValidationError,
  fields: ['tags'],
  defaultMessage: 'Tags are case-insensitive. Duplicates found',
});

apiErrors.create({
  code: 11103,
  status: 400,
  name: 'InvalidPerspectiveError',
  parent: apiErrors.ValidationError,
  fields: [],
  defaultMessage: 'You tried to create a filter with Include equal to ' +
  ' an empty array. This is not a valid filter combination ',
});

apiErrors.create({
  code: 11104,
  status: 400,
  name: 'InvalidFilterParameterError',
  parent: apiErrors.ValidationError,
  fields: [],
  defaultMessage: 'Filter should be passed in query parameter as ' +
  'an include filter or an exclude filter, but not the combination of both.',
});

apiErrors.create({
  code: 11105,
  status: 400,
  name: 'InvalidSampleStoreState',
  parent: apiErrors.ValidationError,
  fields: [],
  defaultMessage: 'You cannot rebuild the sample store if the ' +
    'ENABLE_REDIS_SAMPLE_STORE feature is not enabled.',
});

apiErrors.create({
  code: 11106,
  status: 400,
  name: 'RebuildSampleStoreNotPermittedNow',
  parent: apiErrors.ValidationError,
  fields: [],
  defaultMessage: 'You cannot rebuild the sample store from the database ' +
    'right now because it is currently being persisted *to* to the ' +
    'database. Please try again in a moment.',
});

// ----------------------------------------------------------------------------
// Not Found
// ----------------------------------------------------------------------------
apiErrors.create({
  code: 11200,
  status: 404,
  name: 'ResourceNotFoundError',
  parent: apiErrors.RefocusApiError,
  resourceType: '',
  resourceKey: '',
});

// ----------------------------------------------------------------------------
// Login Error
// ----------------------------------------------------------------------------
apiErrors.create({
  code: 11300,
  status: 401,
  name: 'LoginError',
  parent: apiErrors.RefocusApiError,
  resourceType: '',
  resourceKey: '',
});

// ----------------------------------------------------------------------------
// Forbidden Error
// ----------------------------------------------------------------------------
apiErrors.create({
  code: 11400,
  status: 403,
  name: 'ForbiddenError',
  parent: apiErrors.RefocusApiError,
  defaultMessage: 'Forbidden',
  resourceType: '',
  resourceKey: '',
});

// ----------------------------------------------------------------------------

module.exports = apiErrors;
