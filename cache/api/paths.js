/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license texoverride[] || duration, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./config/paths.js
 *
 * Configuration for API Caching. Sets up default durations for each of the GET
 * paths. Admin may override durations for any path using env var
 * API_CACHE_OVERRIDE.
 */
const duration = '1 minute'; // General default
const smallDuration = '15 seconds'; // Use for samples
const tinyDuration = 10; // Use for the GET .../status endpoints!

let override = {};
try {
  if (process.env.API_CACHE_OVERRIDE) {
    override = JSON.parse(process.env.API_CACHE_OVERRIDE);
  }
} catch (err) {
  console.error('Invalid API_CACHE_OVERRIDE', err.message,
    process.env.API_CACHE_OVERRIDE);
}

module.exports = {
  // Aspects
  '/v1/aspects': override['/v1/aspects'] || duration,
  '/v1/aspects/:key': override['/v1/aspects/:key'] || duration,
  '/v1/aspects/:key/writers': override['/v1/aspects/:key/writers'] || duration,
  '/v1/aspects/:key/writers/:userNameOrId':
    override['/v1/aspects/:key/writers/:userNameOrId'] || duration,

  // Audit Events
  '/v1/auditEvents': override['/v1/auditEvents'] || duration,
  '/v1/auditEvents/:key': override['/v1/auditEvents/:key'] || duration,

  // Bot Actions
  '/v1/botActions': override['/v1/botActions'] || duration,
  '/v1/botActions/:key': override['/v1/botActions/:key'] || duration,
  '/v1/botActions/:key/writers': override['/v1/botActions/:key/writers'] ||
    duration,
  '/v1/botActions/:key/writers/:userNameOrId':
    override['/v1/botActions/:key/writers/:userNameOrId'] || duration,

  // Bot Data
  '/v1/botData': override['/v1/botData'] || duration,
  '/v1/botData/:key': override['/v1/botData/:key'] || duration,
  '/v1/botData/:key/writers': override['/v1/botData/:key/writers'] || duration,
  '/v1/botData/:key/writers/:userNameOrId':
    override['/v1/botData/:key/writers/:userNameOrId'] || duration,

  // Bots
  '/v1/bots': override['/v1/bots'] || duration,
  '/v1/bots/:key': override['/v1/bots/:key'] || duration,
  '/v1/bots/:key/writers': override['/v1/bots/:key/writers'] || duration,
  '/v1/bots/:key/writers/:userNameOrId':
    override['/v1/bots/:key/writers/:userNameOrId'] || duration,

  // Collector Groups
  '/v1/collectorGroups': override['/v1/collectorGroups'] || duration,
  '/v1/collectorGroups/:key': override['/v1/collectorGroups/:key'] || duration,

  // Collectors
  '/v1/collectors': override['/v1/collectors'] || duration,
  '/v1/collectors/:key': override['/v1/collectors/:key'] || duration,
  '/v1/collectors/:key/status': override['/v1/collectors/:key/status'] ||
    duration,
  '/v1/collectors/:key/writers': override['/v1/collectors/:key/writers'] ||
    duration,
  '/v1/collectors/:key/writers/:userNameOrId':
    override['/v1/collectors/:key/writers/:userNameOrId'] || duration,

  // Events
  '/v1/events': override['/v1/events'] || duration,
  '/v1/events/:key': override['/v1/events/:key'] || duration,
  '/v1/events/bulk/{key}/status': override['/v1/events/bulk/{key}/status'] ||
    tinyDuration,

  // Generators
  '/v1/generators': override['/v1/generators'] || duration,
  '/v1/generators/:key': override['/v1/generators/:key'] || duration,
  '/v1/generators/:key/writers': override['/v1/generators/:key/writers'] ||
    duration,
  '/v1/generators/:key/writers/:userNameOrId':
    override['/v1/generators/:key/writers/:userNameOrId'] || duration,

  // Generator Templates
  '/v1/generatorTemplates': override['/v1/generatorTemplates'] || duration,
  '/v1/generatorTemplates/:key': override['/v1/generatorTemplates/:key'] ||
    duration,
  '/v1/generatorTemplates/:key/writers':
    override['/v1/generatorTemplates/:key/writers'] || duration,
  '/v1/generatorTemplates/:key/writers/:userNameOrId':
    override['/v1/generatorTemplates/:key/writers/:userNameOrId'] || duration,
  '/v1/generatorTemplates/:name/:version':
    override['/v1/generatorTemplates/:name/:version'] || duration,

  // Global Config
  '/v1/globalconfig': override['/v1/globalconfig'] || duration,
  '/v1/globalconfig/:key': override['/v1/globalconfig/:key'] || duration,

  // Lenses
  '/v1/lenses': override['/v1/lenses'] || duration,
  '/v1/lenses/:key': override['/v1/lenses/:key'] || duration,
  '/v1/lenses/:key/writers': override['/v1/lenses/:key/writers'] || duration,
  '/v1/lenses/:key/writers/:userNameOrId':
    override['/v1/lenses/:key/writers/:userNameOrId'] || duration,

  // Perspectives
  '/v1/perspectives': override['/v1/perspectives'] || duration,
  '/v1/perspectives/:key': override['/v1/perspectives/:key'] || duration,
  '/v1/perspectives/:key/writers': override['/v1/perspectives/:key/writers'] ||
    duration,
  '/v1/perspectives/:key/writers/:userNameOrId':
    override['/v1/perspectives/:key/writers/:userNameOrId'] || duration,

  // Profiles
  '/v1/profiles': override['/v1/profiles'] || duration,
  '/v1/profiles/:key': override['/v1/profiles/:key'] || duration,

  // Rooms
  '/v1/rooms': override['/v1/rooms'] || duration,
  '/v1/rooms/:key': override['/v1/rooms/:key'] || duration,
  '/v1/rooms/:key/writers': override['/v1/rooms/:key/writers'] || duration,
  '/v1/rooms/:key/writers/:userNameOrId':
    override['/v1/rooms/:key/writers/:userNameOrId'] || duration,
  '/v1/rooms/:roomId/data': override['/v1/rooms/:roomId/data'] || duration,
  '/v1/rooms/:roomId/bots/:botId/data':
    override['/v1/rooms/:roomId/bots/:botId/data'] || duration,

  // Room Types
  '/v1/roomTypes': override['/v1/roomTypes'] || duration,
  '/v1/roomTypes/:key': override['/v1/roomTypes/:key'] || duration,
  '/v1/roomTypes/:key/writers': override['/v1/roomTypes/:key/writers'] ||
    duration,
  '/v1/roomTypes/:key/writers/:userNameOrId':
    override['/v1/roomTypes/:key/writers/:userNameOrId'] || duration,

  // Samples
  '/v1/samples': override['/v1/samples'] || smallDuration,
  '/v1/samples/:key': override['/v1/samples/:key'] || smallDuration,
  '/v1/samples/upsert/bulk/:key/status':
    override['/v1/samples/upsert/bulk/:key/status'] || tinyDuration,

  // SSO Config
  '/v1/ssoconfig': override['/v1/ssoconfig'] || duration,

  // Subjects
  '/v1/subjects': override['/v1/subjects'] || duration,
  '/v1/subjects/:key': override['/v1/subjects/:key'] || duration,
  '/v1/subjects/:key/hierarchy': override['/v1/subjects/:key/hierarchy'] ||
    duration,
  '/v1/subjects/:key/writers': override['/v1/subjects/:key/writers'] ||
    duration,
  '/v1/subjects/:key/writers/:userNameOrId':
    override['/v1/subjects/:key/writers/:userNameOrId'] || duration,
  '/v1/subjects/delete/bulk/:key/status':
    override['/v1/subjects/delete/bulk/:key/status'] || tinyDuration,

  // Tokens
  '/v1/tokens/:key': override['/v1/tokens/:key'] || duration,

  // Users
  '/v1/users': override['/v1/users'] || duration,
  '/v1/users/:key': override['/v1/users/:key'] || duration,
  '/v1/users/:key/tokens': override['/v1/users/:key/tokens'] || duration,
  '/v1/users/:key/tokens/:tokenName':
    override['/v1/users/:key/tokens/:tokenName'] || duration,
};
