/**
 * api/v1/apiErrors.js
 *
 * API Error Definitions
 */
'use strict';

const apiErrors = require('errors');

apiErrors.create({
  code: 11010,
  name: 'FocusApiError',
});

// ----------------------------------------------------------------------------
// Validation Errors
// ----------------------------------------------------------------------------
apiErrors.create({
  code: 11100,
  status: 400,
  name: 'ValidationError',
  parent: apiErrors.FocusApiError,
  fields: [],
});

apiErrors.create({
  code: 11100,
  status: 400,
  name: 'SubjectValidationError',
  parent: apiErrors.ValidationError,
  fields: [],
  defaultMessage: 'You are not allowed to set the subject\'s absolutePath attribute' +
    'directly--it is generated based on the subject\'s name and parent.',
});

// ----------------------------------------------------------------------------
// Not Found
// ----------------------------------------------------------------------------
apiErrors.create({
  code: 11200,
  status: 404,
  name: 'ResourceNotFoundError',
  parent: apiErrors.FocusApiError,
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
  parent: apiErrors.FocusApiError,
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
  parent: apiErrors.FocusApiError,
  resourceType: '',
  resourceKey: '',
});

// ----------------------------------------------------------------------------

module.exports = apiErrors;
