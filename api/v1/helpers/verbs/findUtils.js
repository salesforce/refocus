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
const ZERO = 0;
const ONE = 1;

/**
 * Escapes all percent literals so they're not treated as wildcards.
 *
 * @param {String} val - The value to transform
 * @returns {String} the transformed value
 */
function escapePercentLiterals(val) {
  if (typeof val === 'string' || val instanceof String) {
    if (val.indexOf(constants.SEQ_WILDCARD) > -ONE) {
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
  const arr = chars.map((ch) =>
    (ch === constants.QUERY_PARAM_WILDCARD ? constants.SEQ_WILDCARD : ch));
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
  // given array, return { $in: array }
  if (Array.isArray(val) && props.isEnum) {
    const inClause = {};
    inClause[constants.SEQ_IN] = val;
    return inClause;
  }

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

  for (let i = ZERO; i < keys.length; i++) {
    const key = keys[i];
    if (filter[key] !== undefined) {
      if (!Array.isArray(filter[key])) {
        filter[key] = [filter[key]];
      }

      const values = [];

      /*
       * If enum filter is enabled and key is an enumerable field
       * then create an "in"
       * clause and add it to where clause, e.g.
       * {
       *  where: {
            valueType: { $in: ["PERCENT", "BOOLEAN"] },
          },
       * }
       */
      if (Array.isArray(props.fieldsWithEnum) &&
        props.fieldsWithEnum.indexOf(key) > -ONE) {
        const enumArr = filter[key];

        // to use $in instead of $contains in toWhereClause
        props.isEnum = true;
        values.push(toWhereClause(enumArr, props));
        where[key] = values[ZERO];
      }

      /*
       * If tag filter is enabled and key is "tags", then create a "contains"
       * clause and add it to where clause, e.g.
       * { where : { '$contains': ['tag1', 'tag2'] } }
       */
      else if (props.tagFilterName && key === props.tagFilterName) {
        const tagArr = filter[key];
        values.push(toWhereClause(tagArr, props));
        where[key] = values[ZERO];
      } else {
        for (let j = ZERO; j < filter[key].length; j++) {
          const v = filter[key][j];
          if (typeof v === 'boolean') {
            values.push(v);
          } else if (typeof v === 'string') {
            const arr = v.split(constants.COMMA);
            for (let k = ZERO; k < arr.length; k++) {
              values.push(toWhereClause(arr[k]));
            }
          }
        }

        if (values.length === ONE) {
          where[key] = values[ZERO];
        } else if (values.length > ONE) {
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
 * @returns {Array} a Sequelize "order" array of arrays
 */
function toSequelizeOrder(sortOrder) {
  if (sortOrder) {
    const sortOrderArray = Array.isArray(sortOrder) ?
      sortOrder : [sortOrder];
    return sortOrderArray.map((s) => {
      if (s.indexOf(constants.MINUS) === ZERO) {
        return [`${s.substr(ONE)}`, constants.SEQ_DESC];
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
  if ((params.sort && params.sort.value) || props.defaultOrder) {
    const ord = params.sort.value || props.defaultOrder;
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
  for (let i = ZERO; i < keys.length; i++) {
    const key = keys[i];

    const isFilterField = constants.NOT_FILTER_FIELDS.indexOf(key) < ZERO;

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
 * Returns a filtered resource array,
 * according to the supplied tag string
 *
 * @param {Array} sArr The array of resources
 * to filter from
 * @param {String} tagsStr Comma delimited String with
 * tags to check for.
 * @returns {Array} The filtered array
 */
function filterArrFromArr(sArr, tagsStr) {
  const tagsArr = tagsStr.split(',');
  const TAGLEN = tagsArr.length;

  // Assume TAGLEN has > 0 tags (otherwise express would throw error)
  const INCLUDE = tagsArr[ZERO].charAt(ZERO) !== '-';

  /*
   * If !INCLUDE, splice out the leading "-" in tags. Otherwise throw an
   * exception if tag starts with "-".
   */
  for (let i = TAGLEN - ONE; i >= ZERO; i--) {
    if (tagsArr[i].charAt(ZERO) === '-') {
      if (INCLUDE) {
        throw new Error('To specify EXCLUDE tags, ' +
          'prepend each tag with -');
      }

      tagsArr[i] = tagsArr[i].slice(ONE);
    }
  }

  const filteredArr = [];

  // append iff subject's tags contains all tags in tagsArr
  if (INCLUDE) {
    for (let i = ZERO; i < sArr.length; i++) {
      let count = ZERO;
      const tags = sArr[i].tags;
      for (let j = TAGLEN - ONE; j >= ZERO; j--) {
        if (tags.indexOf(tagsArr[j]) > -ONE) {
          count++;
        }
      }

      if (count === TAGLEN) {
        filteredArr.push(sArr[i]);
      }
    }
  } else {
    // EXCLUDE: append iff none of subject's tags
    // is in tagsArr
    for (let i = ZERO; i < sArr.length; i++) {
      let addToArr = true;
      const tags = sArr[i].tags;
      for (let j = TAGLEN - ONE; j >= ZERO; j--) {
        if (tags.indexOf(tagsArr[j]) > -ONE) {
          addToArr = false;
          break;
        }
      }

      if (addToArr) {
        filteredArr.push(sArr[i]);
      }
    }
  }

  return filteredArr;
}

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
  filterArrFromArr, // for testing
}; // exports
