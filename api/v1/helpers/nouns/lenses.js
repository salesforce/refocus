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
}; // exports
