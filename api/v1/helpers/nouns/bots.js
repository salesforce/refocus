/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/bots.js
 */

const Bots = require('../../../../db/index').Bot;

const m = 'Bot';

module.exports = {
  apiLinks: {
    DELETE: `Delete this ${m}`,
    GET: `Retrieve this ${m}`,
    PATCH: `Update selected attributes of this ${m}`,
    POST: `Create a new ${m}`,
    PUT: `Upgrade this ${m}`,
  },
  fieldScopeMap: {
    botUI: 'botUI',
  },
  getScopes: ['botUI'],
  baseUrl: '/v1/bots',
  model: Bots,
  modelName: 'Bots',
}; // exports
