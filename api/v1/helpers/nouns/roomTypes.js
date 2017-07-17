/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/roomTypes.js
 */

const RoomTypes = require('../../../../db/index').RoomType;

const m = 'RoomTypes';

module.exports = {
  apiLinks: {
    DELETE: `Delete ${m}`,
    GET: `Retrieve ${m}`,
    PATCH: `Update selected attributes of ${m}`,
    POST: `Create a new ${m}`,
  },
  baseUrl: '/v1/roomTypes',
  model: RoomTypes,
  modelName: 'roomTypes',
}; // exports
