/**
 * Copyright (c) 2018, salesforce.com, inc.
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
const httpStatus = require('../../constants').httpStatus;
const redisCache = require('../../../../cache/redisCache').client.cache;
const apiErrors = require('../../apiErrors');

function doFindOne_(reqResNextWrapper, props, opts, dbTimeObject) {
  return props.model
    .findOne(opts)
    .then((object) => {
      dbTimeObject.dbTime = new Date() - dbTimeObject.reqStartTime;
      if (!object) {
        throw new apiErrors.ResourceNotFoundError({
          explanation: `${props.model} not found`,
        });
      }

      if (props.modelName === 'Lens') {
        delete object.dataValues.library;
      }

      return u.responsify(object, props, reqResNextWrapper.req.method);
    })
    .catch((err) => u.handleError(reqResNextWrapper.next, err,
      props.modelName));
} // doFind

function handleResponse(props, responseObject, reqResNextWrapper,
                        dbTimeObject) {
  u.sortArrayObjectsByField(props, responseObject);

  if (props.fieldsToExclude) {
    u.removeFieldsFromResponse(props.fieldsToExclude, responseObject);
  }

  u.logAPI(reqResNextWrapper.req, dbTimeObject, responseObject, null);
  reqResNextWrapper
    .res.status(httpStatus.OK).json(responseObject);
}

function handleResponseWithCache(props, responseObject, reqResNextWrapper,
                                 resultObj) {
  // cache the object by cacheKey.
  if (props.cacheKey) {
    redisCache.setex(
      props.cacheKey,
      props.cacheExpiry,
      JSON.stringify(responseObject));
  }

  handleResponse(props, responseObject, reqResNextWrapper, resultObj);
}

/**
 * Finds a single matching record. Get result from cache if present, else, get
 * results from db and store in cache, if caching is enabled.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Object} props - The helpers/nouns module for the given DB model
 */
module.exports = function doFindOne(req, res, next, props) {
  const dbTimeObject = { reqStartTime: req.timestamp };

  const opts = fu.options(req.swagger.params, props);
  const reqResNextWrapper = { req, res, next };

  if (props.cacheEnabled) {
    redisCache.get(props.cacheKey, (cacheErr, reply) => {
      if (cacheErr || !reply) {
        // No cache, get results from db and set cache
        return doFindOne_(reqResNextWrapper, props, opts, dbTimeObject)
          .then((responseObject) => handleResponseWithCache(props,
            responseObject, reqResNextWrapper, dbTimeObject))
          .catch((err) => u.handleError(next, err, props.modelName));
      }

      // From cache
      dbTimeObject.dbTime = new Date() - dbTimeObject.reqStartTime;
      const responseObject = JSON.parse(reply);
      u.logAPI(req, dbTimeObject, responseObject, null);

      res.status(httpStatus.OK)
        .json(responseObject);
    });
  } else {
    return doFindOne_(reqResNextWrapper, props, opts, dbTimeObject)
      .then((responseObject) => handleResponse(props, responseObject,
        reqResNextWrapper, dbTimeObject))
      .catch((err) => u.handleError(next, err, props.modelName));
  }
}; // exports
