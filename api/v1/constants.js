/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/constants.js
 */
'use strict';

module.exports = {
  httpStatus: {
    OK: 200,
    CREATED: 201,
    REDIRECT: 301,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    NOT_ALLOWED: 405,
  },
  ALL_PERCENTS_RE: /%/g,
  COMMA: ',',
  COUNT_HEADER_NAME: 'X-Total-Count',
  EMPTY_STRING: '',
  ESCAPED_PERCENT: '\\%',
  FILTER_DELIMITER: ',',
  FILTER_NEGATION: '-',
  MINUS: '-',
  NOT_FILTER_FIELDS: ['fields', 'sort', 'limit', 'offset'],
  OFFSET_EQ: 'offset=',
  POSTGRES_UUID_RE:
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  QUERY_PARAM_WILDCARD: '*',
  SEQ_DEFAULT_SCOPE: 'defaultScope',
  SEQ_DESC: 'DESC',
  SEQ_LIKE: '$iLike',
  SEQ_CONTAINS: '$contains',
  SEQ_IN: '$in',
  SEQ_OR: '$or',
  SEQ_WILDCARD: '%',
  SLASH: '/',
  statuses: {
    Critical: 'Critical',
    Invalid: 'Invalid',
    Timeout: 'Timeout',
    Warning: 'Warning',
    Info: 'Info',
    OK: 'OK',
  },
};
