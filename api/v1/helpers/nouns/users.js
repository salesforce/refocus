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
  baseUrl: '/v1/users',
  model: User,
  modelName: 'User',
}; // exports
