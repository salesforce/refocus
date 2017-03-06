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

// ----------------------------------------------------------------------------

module.exports = redisErrors;
