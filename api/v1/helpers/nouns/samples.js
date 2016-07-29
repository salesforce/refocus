/**
 * api/v1/helpers/nouns/samples.js
 */
'use strict';

const Sample = require('../../../../db/index').Sample;

const m = 'sample';

const fieldsWithJsonArrayType = ['relatedLinks'];

module.exports = {
  apiLinks: {
    DELETE: `Delete this ${m}`,
    GET: `Retrieve this ${m}`,
    PATCH: `Update selected attributes of this ${m}`,
    POST: `Create a new ${m}`,
    PUT: `Overwrite all attributes of this ${m}`,
  },
  baseUrl: '/v1/samples',
  model: Sample,
  modelName: 'Sample',
  fieldsWithJsonArrayType,
}; // exports
