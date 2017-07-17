/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/events.js
 */

const Events = require('../../../../db/index').Event;

const m = 'Events';

module.exports = {
  apiLinks: {
    GET: `Retrieve ${m}`,
    POST: `Create a new ${m}`,
  },
  baseUrl: '/v1/events',
  model: Events,
  modelName: 'events',
}; // exports
