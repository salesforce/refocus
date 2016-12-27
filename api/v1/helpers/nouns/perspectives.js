/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/perspectives.js
 */
'use strict'; // eslint-disable-line strict

const Perspective = require('../../../../db/index').Perspective;
const featureToggles = require('feature-toggles');
const m = 'perspective';

module.exports = {
  apiLinks: {
    DELETE: `Delete this ${m}`,
    GET: `Retrieve this ${m}`,
    PATCH: `Update selected attributes of this ${m}`,
    POST: `Create a new ${m}`,
    PUT: `Overwrite all attributes of this ${m}`,
  },
  baseUrl: '/v1/perspectives',
  fieldAbsenceScopeMap: {
    lens: 'withoutLensAssociation',
  },
  model: Perspective,
  modelName: 'Perspective',
  // define the associations that are to be deleted here
  belongsToManyAssoc: {
    users: 'writers',
  },
  cacheEnabled: featureToggles.isFeatureEnabled('enableCachePerspective'),
}; // exports
