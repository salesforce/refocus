/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/botData.js
 */

const BotData = require('../../../../db/index').BotData;

const m = 'BotData';

module.exports = {
  apiLinks: {
    POST: `Create a new ${m}`,
    GET: `Retrieve ${m}`,
    PATCH: `Update selected attributes of ${m}`,
    DELETE: `Delete ${m}`,
  },
  belongsToManyAssoc: {
    users: 'writers',
  },
  baseUrl: '/v1/botData',
  hasMultipartKey: true,
  model: BotData,
  modelName: 'botData',
  timePeriodFilters: ['createdAt', 'updatedAt'],
}; // exports
