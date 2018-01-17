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

const errors = require('errors');

errors.create({
  scope: exports,
  code: 11010,
  name: 'RefocusApiError',
});

// ----------------------------------------------------------------------------
// Validation Errors
// ----------------------------------------------------------------------------
errors.create({
  scope: exports,
  code: 11100,
  status: 400,
  name: 'ValidationError',
  parent: this.RefocusApiError,
  fields: [],
});

errors.create({
  scope: exports,
  code: 11102,
  status: 400,
  name: 'InvalidTokenActionError',
  parent: this.ValidationError,
  fields: [],
  defaultMessage: 'You are not allowed to restore a token if it was not ' +
    'previously revoked, and vice versa.',
});

errors.create({
  scope: exports,
  code: 11103,
  status: 400,
  name: 'DuplicateFieldError',
  parent: this.ValidationError,
  fields: ['tags'],
  defaultMessage: 'Tags are case-insensitive. Duplicates found',
});

errors.create({
  scope: exports,
  code: 11103,
  status: 400,
  name: 'InvalidPerspectiveError',
  parent: this.ValidationError,
  fields: [],
  defaultMessage: 'You tried to create a filter with Include equal to ' +
  ' an empty array. This is not a valid filter combination ',
});

errors.create({
  scope: exports,
  code: 11104,
  status: 400,
  name: 'InvalidFilterParameterError',
  parent: this.ValidationError,
  fields: [],
  defaultMessage: 'Filter should be passed in query parameter as ' +
  'an include filter or an exclude filter, but not the combination of both.',
});

errors.create({
  scope: exports,
  code: 11105,
  status: 400,
  name: 'InvalidSampleStoreState',
  parent: this.ValidationError,
  fields: [],
  defaultMessage: 'You cannot rebuild the sample store if the ' +
    'ENABLE_REDIS_SAMPLE_STORE feature is not enabled.',
});

errors.create({
  scope: exports,
  code: 11106,
  status: 400,
  name: 'RebuildSampleStoreNotPermittedNow',
  parent: this.ValidationError,
  fields: [],
  defaultMessage: 'You cannot rebuild the sample store from the database ' +
    'right now because it is currently being persisted *to* to the ' +
    'database. Please try again in a moment.',
});

errors.create({
  scope: exports,
  code: 11107,
  status: 400,
  name: 'ParentSubjectNotFound',
  parent: this.ValidationError,
  defaultMessage: 'Could not find the specified parent for this subject.',
  explanation: 'If a subject specifies that it has a parent, the parent ' +
   'subject must already exist.',
});

errors.create({
  scope: exports,
  code: 11108,
  status: 400,
  name: 'ParentSubjectNotMatch',
  parent: this.ValidationError,
  defaultMessage: 'The parentAbsolutePath and parentId do not match.',
  explanation: 'If a subject specifies both a parentAbsolutePath and a parentId, the parent ' +
    'specified by both fields need to have the same id.',
});

errors.create({
  scope: exports,
  code: 11109,
  status: 400,
  name: 'IllegalSelfParenting',
  parent: this.ValidationError,
  defaultMessage: 'A subject may not be its own parent.',
});

errors.create({
  scope: exports,
  code: 11110,
  status: 400,
  name: 'DuplicateResourceError',
  parent: this.ValidationError,
  fields: [],
  defaultMessage: 'You are not allowed to create a resource that already exists.',
});

errors.create({
  scope: exports,
  code: 11111,
  status: 400,
  name: 'SampleGeneratorContextDecryptionError',
  parent: this.ValidationError,
  fields: [],
  defaultMessage: 'Unable to decrypt the Sample Generator context data. ' +
  'Please contact your Refocus administrator to set up the encryption ' +
  'algorithm and key to protect the sensitive information ' +
  'in your Sample Generator\'s context',
});

// ----------------------------------------------------------------------------
// Not Found
// ----------------------------------------------------------------------------
errors.create({
  scope: exports,
  code: 11200,
  status: 404,
  name: 'ResourceNotFoundError',
  parent: this.RefocusApiError,
  resourceType: '',
  resourceKey: '',
});

// ----------------------------------------------------------------------------
// Login Error
// ----------------------------------------------------------------------------
errors.create({
  scope: exports,
  code: 11300,
  status: 401,
  name: 'LoginError',
  parent: this.RefocusApiError,
  resourceType: '',
  resourceKey: '',
});

// ----------------------------------------------------------------------------
// Forbidden Error
// ----------------------------------------------------------------------------
errors.create({
  scope: exports,
  code: 11400,
  status: 403,
  name: 'ForbiddenError',
  parent: this.RefocusApiError,
  defaultMessage: 'Forbidden',
  resourceType: '',
  resourceKey: '',
});

// ----------------------------------------------------------------------------
// Worker Timeout Error
// ----------------------------------------------------------------------------
errors.create({
  scope: exports,
  code: 11500,
  status: 503,
  name: 'WorkerTimeoutError',
  parent: this.RefocusApiError,
  defaultMessage: 'Timeout exceeded in worker process',
  resourceType: '',
  resourceKey: '',
});

// ----------------------------------------------------------------------------
