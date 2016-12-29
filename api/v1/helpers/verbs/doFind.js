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
  u.getScopedModel(props, opts.attributes).findAndCountAll(opts)
  .then((o) => {
    reqResNext.res.set(COUNT_HEADER_NAME, o.count);
    const retval = o.rows.map((row) => {
      if (props.modelName === 'Lens') {
        delete row.dataValues.library;
      }

      return u.responsify(row, props, reqResNext.req.method);
    });
    reqResNext.res.status(httpStatus.OK).json(retval);
  })
  .catch((err) => u.handleError(reqResNext.next, err, props.modelName));
} // doFindAndCountAll

/**
 * Finds all matching records.
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
function doFindAll(reqResNext, props, opts) {
  if (opts.where && opts.where.tags && opts.where.tags.$contains.length) {
    // change to filter at the API level
    opts.where.tags.$contains = [];
  }

  u.getScopedModel(props, opts.attributes).findAll(opts)
  .then((o) => {
    reqResNext.res.set(COUNT_HEADER_NAME, o.length);
    let retval = o.map((row) => {
      if (props.modelName === 'Lens') {
        delete row.dataValues.library;
      }

      return u.responsify(row, props, reqResNext.req.method);
    });

    const { tags } = reqResNext.req.swagger.params;
    if (tags && tags.value && tags.value.length) {
      retval = fu.filterArrFromArr(retval, tags.value);
    }

    reqResNext.res.status(httpStatus.OK).json(retval);
  })
  .catch((err) => u.handleError(reqResNext.next, err, props.modelName));
} // doFindAll

/**
 * Finds all matching records. This function is just a wrapper around
 * doFindAll or doFindAndCountAll, depending upon whether we need to paginate
 * the results.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Object} props - The helpers/nouns module for the given DB model
 */
module.exports = function doFind(req, res, next, props) {
  const opts = fu.options(req.swagger.params, props);
  if (opts.limit || opts.offset) {
    res.links({
      prev: req.originalUrl,
      next: fu.getNextUrl(req.originalUrl, opts.limit, opts.offset),
    });
  }

  /*
   * If we're doing a "limit" query, we need to call findAndCountAll, but if
   * we're not doing a "limit" query, just to findAll, avoiding the extra
   * "SELECT count(*)... " database call.
   */
  if (opts.limit) {
    doFindAndCountAll({ req, res, next }, props, opts);
  } else {
    doFindAll({ req, res, next }, props, opts);
  }
}; // exports
