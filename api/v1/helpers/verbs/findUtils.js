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
'use strict'; // eslint-disable-line strict
const u = require('./utils');
const get = require('just-safe-get');
const constants = require('../../constants');
const defaults = require('../../../../config').api.defaults;
const ZERO = 0;
const ONE = 1;
const MINUS_ONE = -1;
const RADIX = 10;
const Op = require('sequelize').Op;

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
 * Escapes all underscore literals so they're not treated as single-character matches.
 *
 * @param {String} val - The value to transform
 * @returns {String} the transformed value
 */
function escapeUnderscoreLiterals(val) {
  if (typeof val === 'string' || val instanceof String) {
    if (val.indexOf(constants.SEQ_MATCH) > -ONE) {
      return val.replace(constants.ALL_UNDERSCORES_RE, constants.ESCAPED_UNDERSCORE);
    }
  }

  return val;
} // escapeUnderscoreLiterals

/**
 * Replaces all the asterisks from the query parameter value with the
 * sequelize wildcard char.
 *
 * @param {String} val - The value to transform
 * @returns {String} the transformed value
 */
function toSequelizeWildcards(val) {
  return val.replace(constants.QUERY_PARAM_REPLACE_ALL_REGEX,
    constants.SEQ_WILDCARD);
} // toSequelizeWildcards

/**
 * Use when the field is in the list of props.fieldsToCamelCase.
 *
 * @param {Array} Array of words.
 * @returns {Array} Converted array where for each word, the first letter
 * is capitalized and the remaining letters are in lowerCase.
 */
function convertArrayElementsToCamelCase(arr) {
  return arr.map((word) => word.substr(0, 1).toUpperCase() +
    word.substr(1).toLowerCase());
}

/**
 * Transforms the value into a Sequelize where clause using "$iLike" for
 *  case-insensitive string matching
 *
 * @param {String} val - The value to transform into a Sequelize where clause
 * @param {Object} props - The helpers/nouns module for the given DB model.
 * @returns {Object} a Sequelize where clause using "$iLike" for
 *  case-insensitive string matching
 */
function toWhereClause(val, props) {

  // given array, return { [Op.in]: array }
  if (Array.isArray(val) && props.isEnum) {
    const inClause = {};
    inClause[Op.in] = val;
    return inClause;
  }

  if (Array.isArray(val) && props.tagFilterName) {
    const tagArr = val;
    const INCLUDE = tagArr[ZERO].charAt(ZERO) !== '-';
    const TAGLEN = tagArr.length;

    /*
     * If !INCLUDE, splice out the leading "-" in tags. Otherwise throw an
     * exception if tag starts with "-".
     */
    for (let i = TAGLEN - ONE; i >= ZERO; i--) {
      if (tagArr[i].charAt(ZERO) === '-') {
        if (INCLUDE) {
          throw new Error('To specify EXCLUDE tags, ' +
            'prepend each tag with -');
        }

        tagArr[i] = tagArr[i].slice(ONE);
      }
    }

    const tags = props.tagFilterName;
    const whereClause = {};
    if (INCLUDE) {
      whereClause[tags] = {};
      whereClause[tags][Op.contains] = val;
    } else { // EXCLUDE
      whereClause[Op.not] = {};
      whereClause[Op.not][tags] = {};
      whereClause[Op.not][tags][Op.overlap] = val;
    }

    return whereClause;
  }

  // TODO handle non-string data types like dates and numbers
  if (typeof val !== 'string') {
    return val;
  }

  const clause = {};
  val = escapePercentLiterals(val);
  val = escapeUnderscoreLiterals(val);
  val = toSequelizeWildcards(val);
  clause[Op.iLike] = val;
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
            valueType: { [Op.in]: ["PERCENT", "BOOLEAN"] },
          },
       * }
       */
      if (Array.isArray(props.fieldsWithEnum) &&
        props.fieldsWithEnum.indexOf(key) > -ONE) {

        // if specified in props, convert the array in query to camelcase.
        const enumArr = (props.fieldsToCamelCase &&
          props.fieldsToCamelCase.indexOf(key) > -ONE) ?
          convertArrayElementsToCamelCase(filter[key]) : filter[key];

        // to use $in instead of $contains in toWhereClause
        props.isEnum = true;
        values.push(toWhereClause(enumArr, props));
        where[key] = values[ZERO];
      }

      /*
       * If tag filter is enabled and key is "tags":
       * If it's an inclusion, create a "contains" clause:
       * { where : { tags: { '$contains': ['tag1', 'tag2'] }}}
       * If it's an exclusion, create a "not" "overlap" clause:
       * { where : { '$not': { tags: { '$overlap': ['tag1', 'tag2'] }}}}}
       */
      else if (props.tagFilterName && key === props.tagFilterName) {
        const tagArr = filter[key];
        Object.assign(where, toWhereClause(tagArr, props));
      } else {
        for (let j = ZERO; j < filter[key].length; j++) {
          const v = filter[key][j];
          if (typeof v === 'boolean') {
            values.push(v);
          } else if (typeof v === 'number') {
            values.push(v);
          } else if (u.looksLikeId(v)) {
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
          where[key][Op.or] = values;
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
 * Check for unique field in opts. If unique field is present, there are
 * following cases:
 * 1) Unique field have single value - set limit to 1
 *    Eg: opts = { where: { [Op.iLike]: { uniqField: 'someValue' } } };
 * 2) Unique field can have multiple values - set limit to the number of values
 *    Eg: opts = { where: { uniqField:
          { [Op.or]: [{ [Op.iLike]: 'someName1' }, { [Op.iLike]: 'someName2' }] },
        } };
 * 3) Unique field have single wildcard value - limit unchanged
      Eg: opts = { where: { [Op.iLike]: { uniqField: '%someValue%' } } };
 * 4) Unique field have multiple values one of which is wildcard value -
 *    limit unchanged
 *    Eg: opts = { where: { uniqField:
          { [Op.or]: [{ [Op.iLike]: 'someName1' }, { [Op.iLike]: '%someName%' }] },
        } };
 * It is assumed that each field value will have $iLike operator applied.
 * @param  {Object} opts - Query options object
 * @param  {Object} props - The helpers/nouns module for the given DB model
 */
function applyLimitIfUniqueField(opts, props) {
  const uniqueFieldName = props.nameFinder || 'name';
  if (opts.where && opts.where[uniqueFieldName]) {
    const optsWhereOR = opts.where[uniqueFieldName][Op.or];
    if (optsWhereOR && Array.isArray(optsWhereOR)) { // multiple values
      let isWildCardExp = false;
      optsWhereOR.forEach((orObj) => {
        if (orObj[Op.iLike] &&
         orObj[Op.iLike].indexOf('%') > MINUS_ONE) {
          isWildCardExp = true;
        }
      });

      if (!isWildCardExp) { // if no wildcard value, set limit to no. of values
        opts.limit = optsWhereOR.length;
      }
    }

    // single value
    const optsWhereFieldLike = opts.where[uniqueFieldName][Op.iLike];
    if (optsWhereFieldLike && optsWhereFieldLike.indexOf('%') < ZERO) {
      opts.limit = 1; // set limit to 1 if no wildcard value
    }
  }
}

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

  // Specify the limit (must not be greater than default)
  opts.limit = defaults.limit;
  if (get(params, 'limit.value')) {
    const lim = parseInt(params.limit.value, RADIX);
    if (lim < defaults.limit) {
      opts.limit = lim;
    }
  }

  opts.offset = defaults.offset;
  if (get(params, 'offset.value')) {
    opts.offset = parseInt(params.offset.value, RADIX);
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
    if (props.modifyWhereClause) {
      props.modifyWhereClause(params, opts);
    }

    applyLimitIfUniqueField(opts, props);
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
  toSequelizeWildcards, // for testing
  applyLimitIfUniqueField, // for testing
}; // exports
