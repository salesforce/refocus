/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./config/paths.js
 *
 * Configuration for API Caching. Sets up default durations for each of the GET
 * paths. Admin may override durations for any path using env var
 * API_CACHE_OVERRIDE.
 */
const pe = process.env;
const globalDefault = pe.API_CACHE_GLOBAL_DEFAULT || '1 minute';

// For bulk status endpoints...
const bulkStatusDefault = pe.API_CACHE_BULK_STATUS_DEFAULT = '10';

let override = {};
try {
  if (pe.API_CACHE_OVERRIDE) {
    override = JSON.parse(pe.API_CACHE_OVERRIDE);
  }
} catch (err) {
  console.error('Invalid API_CACHE_OVERRIDE', err.message,
    pe.API_CACHE_OVERRIDE);
}

module.exports = {
  // Aspects
  '/v1/aspects': override['/v1/aspects'] || globalDefault,
  '/v1/aspects/:key': override['/v1/aspects/:key'] || globalDefault,
  '/v1/aspects/:key/writers': override['/v1/aspects/:key/writers'] ||
    globalDefault,
  '/v1/aspects/:key/writers/:userNameOrId':
    override['/v1/aspects/:key/writers/:userNameOrId'] || globalDefault,

  // Audit Events
  '/v1/auditEvents': override['/v1/auditEvents'] || globalDefault,
  '/v1/auditEvents/:key': override['/v1/auditEvents/:key'] || globalDefault,

  // Bot Actions
  '/v1/botActions': override['/v1/botActions'] || globalDefault,
  '/v1/botActions/:key': override['/v1/botActions/:key'] || globalDefault,
  '/v1/botActions/:key/writers': override['/v1/botActions/:key/writers'] ||
    globalDefault,
  '/v1/botActions/:key/writers/:userNameOrId':
    override['/v1/botActions/:key/writers/:userNameOrId'] || globalDefault,

  // Bot Data
  '/v1/botData': override['/v1/botData'] || globalDefault,
  '/v1/botData/:key': override['/v1/botData/:key'] || globalDefault,
  '/v1/botData/:key/writers': override['/v1/botData/:key/writers'] ||
    globalDefault,
  '/v1/botData/:key/writers/:userNameOrId':
    override['/v1/botData/:key/writers/:userNameOrId'] || globalDefault,

  // Bots
  '/v1/bots': override['/v1/bots'] || globalDefault,
  '/v1/bots/:key': override['/v1/bots/:key'] || globalDefault,
  '/v1/bots/:key/writers': override['/v1/bots/:key/writers'] || globalDefault,
  '/v1/bots/:key/writers/:userNameOrId':
    override['/v1/bots/:key/writers/:userNameOrId'] || globalDefault,

  // Collector Groups
  '/v1/collectorGroups': override['/v1/collectorGroups'] || globalDefault,
  '/v1/collectorGroups/:key': override['/v1/collectorGroups/:key'] ||
    globalDefault,

  // Collectors
  '/v1/collectors': override['/v1/collectors'] || globalDefault,
  '/v1/collectors/:key': override['/v1/collectors/:key'] || globalDefault,
  '/v1/collectors/:key/status': override['/v1/collectors/:key/status'] ||
    globalDefault,
  '/v1/collectors/:key/writers': override['/v1/collectors/:key/writers'] ||
    globalDefault,
  '/v1/collectors/:key/writers/:userNameOrId':
    override['/v1/collectors/:key/writers/:userNameOrId'] || globalDefault,

  // Events
  '/v1/events': override['/v1/events'] || globalDefault,
  '/v1/events/:key': override['/v1/events/:key'] || globalDefault,
  '/v1/events/bulk/{key}/status': override['/v1/events/bulk/{key}/status'] ||
    bulkStatusDefault,

  // Generators
  '/v1/generators': override['/v1/generators'] || globalDefault,
  '/v1/generators/:key': override['/v1/generators/:key'] || globalDefault,
  '/v1/generators/:key/writers': override['/v1/generators/:key/writers'] ||
    globalDefault,
  '/v1/generators/:key/writers/:userNameOrId':
    override['/v1/generators/:key/writers/:userNameOrId'] || globalDefault,

  // Generator Templates
  '/v1/generatorTemplates': override['/v1/generatorTemplates'] ||
    globalDefault,
  '/v1/generatorTemplates/:key': override['/v1/generatorTemplates/:key'] ||
    globalDefault,
  '/v1/generatorTemplates/:key/writers':
    override['/v1/generatorTemplates/:key/writers'] || globalDefault,
  '/v1/generatorTemplates/:key/writers/:userNameOrId':
    override['/v1/generatorTemplates/:key/writers/:userNameOrId'] ||
    globalDefault,
  '/v1/generatorTemplates/:name/:version':
    override['/v1/generatorTemplates/:name/:version'] || globalDefault,

  // Global Config
  '/v1/globalconfig': override['/v1/globalconfig'] || globalDefault,
  '/v1/globalconfig/:key': override['/v1/globalconfig/:key'] || globalDefault,

  // Lenses
  '/v1/lenses': override['/v1/lenses'] || globalDefault,
  '/v1/lenses/:key': override['/v1/lenses/:key'] || globalDefault,
  '/v1/lenses/:key/writers': override['/v1/lenses/:key/writers'] ||
    globalDefault,
  '/v1/lenses/:key/writers/:userNameOrId':
    override['/v1/lenses/:key/writers/:userNameOrId'] || globalDefault,

  // Perspectives
  '/v1/perspectives': override['/v1/perspectives'] || globalDefault,
  '/v1/perspectives/:key': override['/v1/perspectives/:key'] || globalDefault,
  '/v1/perspectives/:key/writers': override['/v1/perspectives/:key/writers'] ||
    globalDefault,
  '/v1/perspectives/:key/writers/:userNameOrId':
    override['/v1/perspectives/:key/writers/:userNameOrId'] || globalDefault,

  // Profiles
  '/v1/profiles': override['/v1/profiles'] || globalDefault,
  '/v1/profiles/:key': override['/v1/profiles/:key'] || globalDefault,

  // Rooms
  '/v1/rooms': override['/v1/rooms'] || globalDefault,
  '/v1/rooms/:key': override['/v1/rooms/:key'] || globalDefault,
  '/v1/rooms/:key/writers': override['/v1/rooms/:key/writers'] ||
    globalDefault,
  '/v1/rooms/:key/writers/:userNameOrId':
    override['/v1/rooms/:key/writers/:userNameOrId'] || globalDefault,
  '/v1/rooms/:roomId/data': override['/v1/rooms/:roomId/data'] ||
    globalDefault,
  '/v1/rooms/:roomId/bots/:botId/data':
    override['/v1/rooms/:roomId/bots/:botId/data'] || globalDefault,

  // Room Types
  '/v1/roomTypes': override['/v1/roomTypes'] || globalDefault,
  '/v1/roomTypes/:key': override['/v1/roomTypes/:key'] || globalDefault,
  '/v1/roomTypes/:key/writers': override['/v1/roomTypes/:key/writers'] ||
    globalDefault,
  '/v1/roomTypes/:key/writers/:userNameOrId':
    override['/v1/roomTypes/:key/writers/:userNameOrId'] || globalDefault,

  // Samples
  '/v1/samples': override['/v1/samples'] || globalDefault,
  '/v1/samples/:key': override['/v1/samples/:key'] || globalDefault,
  '/v1/samples/upsert/bulk/:key/status':
    override['/v1/samples/upsert/bulk/:key/status'] || bulkStatusDefault,

  // SSO Config
  '/v1/ssoconfig': override['/v1/ssoconfig'] || globalDefault,

  // Subjects
  '/v1/subjects': override['/v1/subjects'] || globalDefault,
  '/v1/subjects/:key': override['/v1/subjects/:key'] || globalDefault,
  '/v1/subjects/:key/hierarchy': override['/v1/subjects/:key/hierarchy'] ||
    globalDefault,
  '/v1/subjects/:key/writers': override['/v1/subjects/:key/writers'] ||
    globalDefault,
  '/v1/subjects/:key/writers/:userNameOrId':
    override['/v1/subjects/:key/writers/:userNameOrId'] || globalDefault,
  '/v1/subjects/delete/bulk/:key/status':
    override['/v1/subjects/delete/bulk/:key/status'] || bulkStatusDefault,

  // Tokens
  '/v1/tokens/:key': override['/v1/tokens/:key'] || globalDefault,

  // Users
  '/v1/users': override['/v1/users'] || globalDefault,
  '/v1/users/:key': override['/v1/users/:key'] || globalDefault,
  '/v1/users/:key/tokens': override['/v1/users/:key/tokens'] || globalDefault,
  '/v1/users/:key/tokens/:tokenName':
    override['/v1/users/:key/tokens/:tokenName'] || globalDefault,
};
