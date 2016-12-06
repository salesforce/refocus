/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/nouns/tokens.js
 */
'use strict';

const Token = require('../../../../db/index').Token;

const m = 'token';

module.exports = {
  apiLinks: {
    DELETE: `Delete this ${m}`,
    GET: `Retrieve this ${m}`,
    POST: `Create a new ${m}`,
  },
  baseUrl: '/v1/tokens',
  model: Token,
  modelName: 'Token',
  stringify: ['isRevoked'],
}; // exports
