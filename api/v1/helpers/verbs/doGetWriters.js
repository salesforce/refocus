/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/helpers/verbs/doGetWriters.js
 */
'use strict'; // eslint-disable-line strict
const httpStatus = require('../../constants').httpStatus;
const u = require('./utils');
const userProps = require('../nouns/users');
const ZERO = 0;

/**
 * Determine whether a user is an authorized writer for a Collector. If user is
 * unauthorized, there is no writer by this name for this collector.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Module} props - The module containing the properties of the
 *  resource type to delete.
 */
function getWriter(req, res, next, props) {
  const resultObj = { reqStartTime: req.timestamp };
  const params = req.swagger.params;
  const options = {
    where: u.whereClauseForNameOrId(params.userNameOrId.value),
  };
  u.findAssociatedInstances(props, params, props.belongsToManyAssoc.users,
    options)
  .then((o) => {
    resultObj.dbTime = new Date() - resultObj.reqStartTime;

    // throw a ResourceNotFound error if resolved object is empty array
    u.throwErrorForEmptyArray(o, params.userNameOrId.value,
      userProps.modelName);

    // otherwise return the first element of the array
    const retval = u.responsify(o[ZERO], props, req.method);
    u.logAPI(req, resultObj, retval);
    res.status(httpStatus.OK).json(retval);
  })
  .catch((err) => u.handleError(next, err, props.modelName));
} // getWriter

/**
 * Returns a list of users permitted to modify this collector. DOES NOT use
 * wildcards.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Module} props - The module containing the properties of the
 *  resource type to delete.
 */
function getWriters(req, res, next, props) {
  const resultObj = { reqStartTime: req.timestamp };
  const params = req.swagger.params;
  u.findAssociatedInstances(props, params, props.belongsToManyAssoc.users, {})
  .then((o) => {
    resultObj.dbTime = new Date() - resultObj.reqStartTime;
    const retval = u.responsify(o, props, req.method);
    u.logAPI(req, resultObj, retval);
    res.status(httpStatus.OK).json(retval);
  })
  .catch((err) => u.handleError(next, err, props.modelName));
} // getWriters

module.exports = {
  getWriter,
  getWriters,
};
