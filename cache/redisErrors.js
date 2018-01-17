/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * cache/redisErrors.js
 *
 * Redis Error Definitions
 */

const errors = require('errors');

errors.create({
  scope: exports,
  code: 10010,
  name: 'RefocusRedisError',
});

// ----------------------------------------------------------------------------
// Validation Errors
// ----------------------------------------------------------------------------
errors.create({
  scope: exports,
  code: 11100,
  status: 400,
  name: 'ValidationError',
  parent: this.RefocusRedisError,
  fields: [],
});

// ----------------------------------------------------------------------------
// Not Found
// ----------------------------------------------------------------------------
errors.create({
  scope: exports,
  code: 11200,
  status: 404,
  name: 'ResourceNotFoundError',
  parent: this.RefocusRedisError,
  resourceType: '',
  resourceKey: '',
});

// ---------------------------------------------------------------------------
// Permission Errors
// ----------------------------------------------------------------------------
errors.create({
  scope: exports,
  code: 11300,
  status: 403,
  name: 'UpdateDeleteForbidden',
  parent: this.RefocusRedisError,
  fields: [],
});

// ----------------------------------------------------------------------------
// Forbidden Error
// ----------------------------------------------------------------------------
errors.create({
  scope: exports,
  code: 11400,
  status: 403,
  name: 'ForbiddenError',
  parent: this.RefocusRedisError,
  defaultMessage: 'Forbidden',
  resourceType: '',
  resourceKey: '',
});

// ----------------------------------------------------------------------------
