/**
 * api/v1/helpers/nouns/profiles.js
 */
'use strict';

const Profile = require('../../../../db/index').Profile;

const m = 'profile';

module.exports = {
  apiLinks: {
    DELETE: `Delete this ${m}`,
    GET: `Retrieve this ${m}`,
    PATCH: `Update selected attributes of this ${m}`,
    POST: `Create a new ${m}`,
    PUT: `Overwrite all attributes of this ${m}`,
  },
  baseUrl: '/v1/profiles',
  fieldScopeMap: {
    users: 'withUsers',
  },
  model: Profile,
  modelName: 'Profile',
}; // exports
