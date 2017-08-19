/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/generators.js
 */
'use strict';

const Generator = require('../../../../db/index').Generator;

const m = 'generator';

module.exports = {
  apiLinks: {
    DELETE: `Delete this ${m}`,
    GET: `Retrieve this ${m}`,
    PATCH: `Update selected attributes of this ${m}`,
    POST: `Create a new ${m}`,
    PUT: `Overwrite all attributes of this ${m}`,
  },
  baseUrl: '/v1/generators',
  model: Generator,
  modelName: 'Generator',

  // define the associations that are to be deleted here
  belongsToManyAssoc: {
    users: 'writers',
  },
  fieldsWithArrayType: ['tags'],
  tagFilterName: 'tags',
}; // exports
