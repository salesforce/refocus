/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/collectors.js
 */
'use strict';

const Collector = require('../../../../db/index').Collector;
const m = 'collector';

module.exports = {
  apiLinks: {
    GET: `Retrieve this ${m}`,
    PATCH: `Update selected attributes of this ${m}`,
    PUT: `Overwrite all attributes of this ${m}`,
  },
  baseUrl: '/v1/collectors',
  model: Collector,
  modelName: 'Collector',

  // define the associations that are to be deleted here
  belongsToManyAssoc: {
    users: 'writers',
  },
  fieldsWithEnum: ['status'],
  readOnlyFields: ['id', 'isDeleted'],
  fieldsWritableByCollectorOnly: ['osInfo', 'processInfo', 'version'],
}; // exports
