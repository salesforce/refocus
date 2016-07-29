/**
 * api/v1/helpers/nouns/perspectives.js
 */
'use strict';

const Perspective = require('../../../../db/index').Perspective;

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
  model: Perspective,
  modelName: 'Perspective',
}; // exports
