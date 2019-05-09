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
const redis = require('../redisCache');;
const opts = {
  enabled: featureToggles.isFeatureEnabled('enableApiCache'),
  headerBlacklist: [ // list of headers that should never be cached
    'retry-after',
    'x-ratelimit-limit',
    'x-ratelimit-remaining',
    'x-ratelimit-reset',
  ],
  redisClient: redis.client.cache,
  statusCodes: {
    include: [200], // caches ONLY responses with a success/200 code
  },
};

module.exports = apicache.options(opts).middleware;
