/**
 * api/v1/helpers/nouns/aspects.js
 */
'use strict';

const Aspect = require('../../../../db/index').Aspect;

const m = 'aspect';

// list related associations and convert it to a set
const assocList = ['tags'];
const assocSet = new Set(assocList);
const fieldsWithJsonArrayType = ['relatedLinks'];

module.exports = {
  apiLinks: {
    DELETE: `Delete this ${m}`,
    GET: `Retrieve this ${m}`,
    PATCH: `Update selected attributes of this ${m}`,
    POST: `Create a new ${m}`,
    PUT: `Overwrite all attributes of this ${m}`,
  },
  baseUrl: '/v1/aspects',
  fieldScopeMap: {
    samples: 'withSamples',
  },
  model: Aspect,
  modelName: 'Aspect',
  assocSet,
  fieldsWithJsonArrayType,
}; // exports
