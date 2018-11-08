/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/doFind.js
 */
'use strict'; // eslint-disable-line strict
const u = require('./utils');
const fu = require('./findUtils');
const COUNT_HEADER_NAME = require('../../constants').COUNT_HEADER_NAME;
const httpStatus = require('../../constants').httpStatus;
const redisCache = require('../../../../cache/redisCache').client.cache;

/**
 * Finds all matching records but only returns a subset of the results for
 * pagination. Includes a header with the full count.
 *
 * NOTE : Sequelize is not able to generate the right postgres sql aggeragate
 * query for Subject and Aspect objects to count the samples associated with
 * them. So, these models are scoped before finding them and the length
 * of the associated sample array is used as the sample count.
 *
 * @param {Object} reqResNext - The object containing the request object, the
 *  response object and the next middleware function in the stack
 * @param {Object} props - The helpers/nouns module for the given DB model
 * @param {Object} opts - The "options" object to pass into the Sequelize
 *  find command
 */
function doFindAndCountAll(reqResNext, props, opts, resultObj) {
  return u.getScopedModel(props, opts.attributes)
    .findAndCountAll(opts)
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      reqResNext.res.set(COUNT_HEADER_NAME, o.count);
      return o.rows.map((row) => {
        if (props.modelName === 'Lens') {
          delete row.dataValues.library;
        }

        return u.responsify(row, props, reqResNext.req.method);
      });
    })
    .catch((err) => u.handleError(reqResNext.next, err, props.modelName));
} // doFindAndCountAll

/**
 * Finds all matching records. This function is just a wrapper around
 * doFindAll or doFindAndCountAll, depending upon whether we need to paginate
 * the results. If cacheKey is provided, we cache the response.
 *
 * @param {Object} reqResNext - The object containing the request object, the
 *  response object and the next middleware function in the stack
 * @param {Object} props - The helpers/nouns module for the given DB model
 * @param {Object} opts - The "options" object to pass into the Sequelize
 * find command
 */
function doFindResponse(reqResNext, props, opts, resultObj) {
  if (opts.limit || opts.offset) {
    reqResNext.res.links({
      prev: reqResNext.req.originalUrl,
      next: fu.getNextUrl(reqResNext.req.originalUrl, opts.limit, opts.offset),
    });
  }

  return doFindAndCountAll(reqResNext, props, opts, resultObj)
    .then((retVal) => {
      u.sortArrayObjectsByField(props, retVal);

      // loop through remove values to delete property
      if (props.fieldsToExclude) {
        for (let i = retVal.length - 1; i >= 0; i--) {
          u.removeFieldsFromResponse(props.fieldsToExclude, retVal[i]);
        }
      }

      if (props.cacheKey) {
        // cache the object by cacheKey.
        const strObj = JSON.stringify(retVal);
        redisCache.setex(props.cacheKey, props.cacheExpiry, strObj);
      }

      u.logAPI(reqResNext.req, resultObj, retVal);
      reqResNext.res.status(httpStatus.OK).json(retVal);
    })
    .catch((err) => u.handleError(reqResNext.next, err, props.modelName));
}

/**
 * Finds all matching records. Get result from cache if present, else, get
 * results from db and store in cache, if caching is enabled.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Object} props - The helpers/nouns module for the given DB model
 */
module.exports = function doFind(req, res, next, props) {
  const resultObj = { reqStartTime: req.timestamp };
  const opts = fu.options(req.swagger.params, props);

  // Check if Cache is on or not
  if (props.cacheEnabled) {
    redisCache.get(props.cacheKey, (cacheErr, reply) => {
      if (cacheErr || !reply) {
        // if err or no reply, get resuls from db and set redis cache
        return doFindResponse({ req, res, next }, props, opts, resultObj);
      }

      // get from cache
      try {
        const dbObj = JSON.parse(reply);
        resultObj.dbTime = new Date() - resultObj.reqStartTime;
        u.logAPI(req, resultObj, dbObj);
        res.status(httpStatus.OK).json(dbObj);
      } catch (err) {
        u.handleError(next, err, props.modelName);
      }
    });
  } else {
    return doFindResponse({ req, res, next }, props, opts, resultObj);
  }
}; // exports
