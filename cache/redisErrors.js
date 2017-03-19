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

const redisErrors = require('errors');

redisErrors.create({
  code: 10010,
  name: 'RefocusRedisError',
});

// ----------------------------------------------------------------------------
// Validation Errors
// ----------------------------------------------------------------------------
redisErrors.create({
  code: 11100,
  status: 400,
  name: 'ValidationError',
  parent: redisErrors.RefocusRedisError,
  fields: [],
});

// ----------------------------------------------------------------------------
// Not Found
// ----------------------------------------------------------------------------
redisErrors.create({
  code: 11200,
  status: 404,
  name: 'ResourceNotFoundError',
  parent: redisErrors.RefocusRedisError,
  resourceType: '',
  resourceKey: '',
});

// ---------------------------------------------------------------------------
// Permission Errors
// ----------------------------------------------------------------------------
redisErrors.create({
  code: 11300,
  status: 403,
  name: 'UpdateDeleteForbidden',
  parent: redisErrors.RefocusRedisError,
  fields: [],
});

// ----------------------------------------------------------------------------
// Forbidden Error
// ----------------------------------------------------------------------------
redisErrors.create({
  code: 11400,
  status: 403,
  name: 'ForbiddenError',
  parent: redisErrors.RefocusRedisError,
  defaultMessage: 'Forbidden',
  resourceType: '',
  resourceKey: '',
});

// ----------------------------------------------------------------------------

module.exports = redisErrors;
