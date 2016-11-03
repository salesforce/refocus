/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/findUtils.js
 */
'use strict';
const u = require('./utils');
const constants = require('../../constants');
const defaults = require('../../../../config').api.defaults;

/**
 * Escapes all percent literals so they're not treated as wildcards.
 *
 * @param {String} val - The value to transform
 * @returns {String} the transformed value
 */
function escapePercentLiterals(val) {
  if (typeof val === 'string' || val instanceof String) {
    if (val.indexOf(constants.SEQ_WILDCARD) >= 0) {
      return val.replace(constants.ALL_PERCENTS_RE, constants.ESCAPED_PERCENT);
    }
  }

  return val;
} // escapePercentLiterals

/**
 * Replaces all the asterisks from the query parameter value with the
 * sequelize wildcard char.
 *
 * @param {String} val - The value to transform
 * @returns {String} the transformed value
 */
function toSequelizeWildcards(val) {
  const chars = val.split(constants.EMPTY_STRING);
  const arr = chars.map((ch) => {
    return ch === constants.QUERY_PARAM_WILDCARD ?
      constants.SEQ_WILDCARD : ch;
  });
  return arr.join(constants.EMPTY_STRING);
} // toSequelizeWildcards

/**
 * Transforms the value into a Sequelize where clause using "$ilike" for
 *  case-insensitive string matching
 *
 * @param {String} val - The value to transform into a Sequelize where clause
 * @param {Object} props - The helpers/nouns module for the given DB model.
 * @returns {Object} a Sequelize where clause using "$ilike" for
 *  case-insensitive string matching
 */
function toWhereClause(val, props) {
  if (Array.isArray(val) && props.tagFilterName) {
    const containsClause = {};
    containsClause[constants.SEQ_CONTAINS] = val;
    return containsClause;
  }

  // TODO handle non-string data types like dates and numbers
  if (typeof val !== 'string') {
    return val;
  }

  const clause = {};
  clause[constants.SEQ_LIKE] =
    toSequelizeWildcards(escapePercentLiterals(val));
  return clause;
} // toWhereClause

/**
 * Transforms the filter fields and values from request query parameters into
 * a Sequelize "where" object.
 *
 * @param {Object} filter
 * @param {Object} props - The helpers/nouns module for the given DB model.
 * @returns {Object} a Sequelize "where" object
 */
function toSequelizeWhere(filter, props) {
  const where = {};
  const keys = Object.keys(filter);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (filter[key] !== undefined) {
      if (!Array.isArray(filter[key])) {
        filter[key] = [filter[key]];
      }

      const values = [];

      // if tag filter is enabled and key is "tags", then create a contains
      // clause and add it to where clause,
      // like,  { where : { '$contains': ['tag1', 'tag2'] } }
      if (props.tagFilterName && key === props.tagFilterName) {
        const tagArr = filter[key];
        values.push(toWhereClause(tagArr, props));
        where[key] = values[0];
      } else {
        for (let j = 0; j < filter[key].length; j++) {
          const v = filter[key][j];
          if (typeof v === 'boolean') {
            values.push(v);
          } else if (typeof v === 'string') {
            const arr = v.split(constants.COMMA);
            for (let k = 0; k < arr.length; k++) {
              values.push(toWhereClause(arr[k]));
            }
          }
        }

        if (values.length === 1) {
          where[key] = values[0];
        } else if (values.length > 1) {
          where[key] = {};
          where[key][constants.SEQ_OR] = values;
        }
      }
    }
  }

  return where;
}

/**
 * Transforms the sort order from the request query parameters into a sequelize
 * a Sequelize "order" array of arrays.
 *
 * @param {Array|String} sortOrder - The sort order to transform
 * @param {String} modelName - The DB model name, used to disambiguate field
 *  names
 * @returns {Array} a Sequelize "order" array of arrays
 */
function toSequelizeOrder(sortOrder, modelName) {
  if (sortOrder) {
    const sortOrderArray = Array.isArray(sortOrder) ?
      sortOrder : [sortOrder];
    return sortOrderArray.map((s) => {
      if (s.indexOf(constants.MINUS) === 0) {
        return [`${s.substr(1)}`, constants.SEQ_DESC];
      }

      return `${s}`;
    });
  }

  return [];
} // toSequelizeOrder

/**
 * Builds the "options" object to pass intto the Sequelize find command.
 *
 * @param {Object} params - The request params
 * @param {Object} props - The helpers/nouns module for the given DB model
 * @returns {Object} the "options" object to pass into the Sequelize find
 *  command
 */
function options(params, props) {
  const opts = u.buildFieldList(params);

  // Specify the sort order. If defaultOrder is defined in props or sort value
  // then update sort order otherwise take value from model defination
  if (params.sort.value || props.defaultOrder) {
    const ord = (params.sort ? params.sort.value : null) || props.defaultOrder;
    opts.order = toSequelizeOrder(ord, props.modelName);
  }

  // Specify the limit
  if (params.limit.value) {
    opts.limit = parseInt(params.limit.value, defaults.limit);
  }

  if (params.offset.value) {
    opts.offset = parseInt(params.offset.value, defaults.offset);
  }

  const filter = {};
  const keys = Object.keys(params);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];

    const isFilterField = constants.NOT_FILTER_FIELDS.indexOf(key) < 0;

    if (isFilterField && params[key].value !== undefined) {
      filter[key] = params[key].value;
    }
  }

  if (filter) {
    opts.where = toSequelizeWhere(filter, props);
  }

  return opts;
} // options

/**
 * Generates the "next" URL for paginated result sets.
 *
 * @param {String} url - The original URL
 * @param {Integer} limit - The maximum number of records to return
 * @param {Integer} offset - The offset for paginated result sets
 * @returns {String} the "next" URL for paginated result sets
 */
function getNextUrl(url, limit, offset) {
  return url.replace(
    constants.OFFSET_EQ + offset,
    constants.OFFSET_EQ + (offset + limit)
  );
} // getNextUrl

module.exports = {
  getNextUrl,
  options,
}; // exports
