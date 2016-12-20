/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/users.js
 */
'use strict';

const User = require('../../../../db/index').User;

const m = 'user';

module.exports = {
  apiLinks: {
    DELETE: `Delete this ${m}`,
    GET: `Retrieve this ${m}`,
    PATCH: `Update selected attributes of this ${m}`,
    POST: `Create a new ${m}`,
    PUT: `Overwrite all attributes of this ${m}`,
  },
  scopeMap: {
    withoutSensitiveInfo: 'withoutSensitiveInfo',
  },
  baseUrl: '/v1/users',
  model: User,
  modelName: 'User',
  writePermissionNotModified: 'Write permission for the record was not ' +
                                'modified in this request',
}; // exports
