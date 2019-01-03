/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/collectorGroups.js
 */
'use strict';
const CollectorGroup = require('../../../../db/index').CollectorGroup;
const m = 'CollectorGroup';

module.exports = {
  apiLinks: {
    GET: `Retrieve this ${m}`,
    PATCH: `Update selected attributes of this ${m}`,
    PUT: `Overwrite all attributes of this ${m}`,
  },
  baseUrl: '/v1/collectorGroups',
  model: CollectorGroup,
  modelName: 'CollectorGroup',
}; // exports
