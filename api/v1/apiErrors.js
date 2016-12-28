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
  code: 11101,
  status: 400,
  name: 'SubjectValidationError',
  parent: apiErrors.ValidationError,
  fields: [],
  defaultMessage: 'You are not allowed to set the subject\'s absolutePath ' +
    'attribute directly--it is generated based on the subject\'s name and ' +
    'parent.',
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
