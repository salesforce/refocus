/**
 * api/v1/helpers/nouns/ssoconfig.js
 */

const SSOConfig = require('../../../../db/index').SSOConfig;

const m = 'sso config';

module.exports = {
  apiLinks: {
    DELETE: `Delete ${m}`,
    GET: `Retrieve ${m}`,
    PATCH: `Update selected attributes of ${m}`,
    POST: `Create a new ${m}`,
    PUT: `Overwrite all attributes of ${m}`,
  },
  baseUrl: '/v1/ssoconfig',
  model: SSOConfig,
  modelName: 'SSOConfig',
}; // exports
