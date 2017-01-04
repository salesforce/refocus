/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/lenses.js
 */
'use strict';

const Lens = require('../../../../db/index').Lens;

const m = 'lens';

module.exports = {
  apiLinks: {
    DELETE: `Uninstall this ${m}`,
    GET: `Retrieve this ${m}`,
    POST: `Install a new ${m}`,
    PUT: `Upgrade to a new version of this ${m}`,
  },
  fieldScopeMap: {
    lensLibrary: 'lensLibrary',
  },
  baseUrl: '/v1/lenses',
  model: Lens,
  modelName: 'Lens',

  // define the associations that are to be deleted here
  belongsToManyAssoc: {
    users: 'writers',
  },
}; // exports
