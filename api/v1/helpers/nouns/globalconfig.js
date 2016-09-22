/**
 * api/v1/helpers/nouns/globalconfig.js
 */

const GlobalConfig = require('../../../../db/index').GlobalConfig;

const m = 'GlobalConfig';

module.exports = {
  apiLinks: {
    DELETE: `Delete ${m}`,
    GET: `Retrieve ${m}`,
    PATCH: `Update selected attributes of ${m}`,
    POST: `Create a new ${m}`,
  },
  baseUrl: '/v1/globalconfig',
  model: GlobalConfig,
  modelName: 'GlobalConfig',
  nameFinder: 'key',
}; // exports
