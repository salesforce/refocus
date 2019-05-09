/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./cache/api/middleware.js
 *
 * Middleware for API Caching using Redis
 */
const apicache = require('apicache');
const featureToggles = require('feature-toggles');
const redisClient = require('../redisCache').client.cache;
const opts = {
  enabled: featureToggles.isFeatureEnabled('enableApiCache'),
  headerBlacklist: [
    'retry-after',
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
  ],
  redisClient,
  statusCodes: {
    include: 200,
  },
};

module.exports = apicache.options(opts).middleware;
