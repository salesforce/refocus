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
'use strict';
const u = require('./utils');
const fu = require('./findUtils');
const COUNT_HEADER_NAME = require('../../constants').COUNT_HEADER_NAME;
const httpStatus = require('../../constants').httpStatus;
const redisCache = require('../../../../cache/redisCache').client.cache;
const config = require('../../../../config');
const cacheExpiry = config.CACHE_EXPIRY_IN_SECS;

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
function doFindAndCountAll(reqResNext, props, opts) {
  const resultObj = { reqStartTime: new Date() };

  // enforce the default limit
  if (!opts.limit || opts.limit > config.GET_REQUEST_DEFAULT_LIMIT) {
    opts.limit = config.GET_REQUEST_DEFAULT_LIMIT;
  }

  return u.getScopedModel(props, opts.attributes).findAndCountAll(opts)
  .then((o) => {
    resultObj.dbTime = new Date() - resultObj.reqStartTime;
    reqResNext.res.set(COUNT_HEADER_NAME, o.count);

    const retval = o.rows.map((row) => {
      if (props.modelName === 'Lens') {
        delete row.dataValues.library;
      }

      return u.responsify(row, props, reqResNext.req.method);
    });
    u.logAPI(reqResNext.req, resultObj, retval);
    return retval;
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
 * @param {Object} cacheKey - Optional cache key used to cache the response in
 * redis
 */
function doFindResponse(reqResNext, props, opts, cacheKey) {
  if (opts.limit || opts.offset) {
    reqResNext.res.links({
      prev: reqResNext.req.originalUrl,
      next: fu.getNextUrl(reqResNext.req.originalUrl, opts.limit, opts.offset),
    });
  }

  doFindAndCountAll(reqResNext, props, opts)
  .then((retval) => {

    // loop through remove values to delete property
    if (props.fieldsToExclude) {
      for (let i = retval.length - 1; i >= 0; i--) {
        u.removeFieldsFromResponse(props.fieldsToExclude, retval[i]);
      }
    }

    reqResNext.res.status(httpStatus.OK).json(retval);

    if (cacheKey) {
      // cache the object by cacheKey. Store the key-value pair in cache
      // with an expiry of 1 minute (60s)
      const strObj = JSON.stringify(retval);
      redisCache.setex(cacheKey, cacheExpiry, strObj);
    }
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
  const opts = fu.options(req.swagger.params, props);
  const cacheKey = JSON.stringify(opts);

  //only cache requests with no params
  if (props.cacheEnabled && cacheKey === '{"where":{}}') {

    redisCache.get(cacheKey, (cacheErr, reply) => {
      if (cacheErr || !reply) {
        // if err or no reply, get resuls from db and set redis cache
        doFindResponse({ req, res, next }, props, opts, cacheKey);
      } else {
        // get from cache
        const dbObj = JSON.parse(reply);
        res.status(httpStatus.OK).json(dbObj);
      }
    });
  } else {
    doFindResponse({ req, res, next }, props, opts);
  }
}; // exports
