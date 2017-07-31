/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/collectors.js
 */
'use strict'; // eslint-disable-line strict
const featureToggles = require('feature-toggles');
const utils = require('./utils');
const apiErrors = require('../apiErrors');
const helper = require('../helpers/nouns/collectors');
const userProps = require('../helpers/nouns/users');
const doDelete = require('../helpers/verbs/doDelete');
const doDeleteAllAssoc = require('../helpers/verbs/doDeleteAllBToMAssoc');
const doDeleteOneAssoc = require('../helpers/verbs/doDeleteOneBToMAssoc');
const doPostAssoc = require('../helpers/verbs/doPostBToMAssoc');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;
const authUtils = require('../helpers/authUtils');
const ZERO = 0;

/**
 * Register a collector. Access restricted to Refocus Collector only.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function postCollector(req, res, next) {
  // TODO reject if caller is not a collector
  doPost(req, res, next, helper);
} // postCollector

/**
 * Find a collector or collectors. You may query using field filters with
 * asterisk (*) wildcards. You may also optionally specify sort, limit, offset,
 * and a list of fields to include in the response.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function findCollectors(req, res, next) {
  doFind(req, res, next, helper);
} // findCollectors

/**
 * Retrieve the specified collector metadata by the collector's id or name. You
 * may also optionally specify a list of fields to include in the response.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function getCollector(req, res, next) {
  doGet(req, res, next, helper);
} // getCollector

/**
 * Update the specified collector's config data. If a field is not included in
 * the querybody, that field will not be updated.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function patchCollector(req, res, next) {
  doPatch(req, res, next, helper);
} // patchCollector

/**
 * Update the specified collector's config data. If a field is not included in
 * the querybody, that field will be set to null.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function putCollector(req, res, next) {
  doPut(req, res, next, helper);
} // putCollector

/**
 * Deregister a collector. Access restricted to Refocus Collector only.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function deregisterCollector(req, res, next) {
  // TODO reject if caller's token is not a collector token
  doPatch(req, res, next, helper);
} // deregisterCollector

/**
 * Send heartbeat from collector. Access restricted to Refocus Collector only.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function heartbeat(req, res, next) {
  // TODO reject if caller's token is not a collector token
  // TODO implement me!
} // heartbeat

/**
 * Change collector status to Running. Invalid if the collector's status is
 * not Stopped.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function startCollector(req, res, next) {
  // TODO reject if caller's token is not a collector token
  req.swagger.params.queryBody = {
    value: { status: 'Running' },
  };
  doPatch(req, res, next, helper);
} // stopCollector

/**
 * Change collector status to Stopped. Invalid if the collector's status is
 * Stopped.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function stopCollector(req, res, next) {
  req.swagger.params.queryBody = {
    value: { status: 'Stopped' },
  };
  doPatch(req, res, next, helper);
} // stopCollector

/**
 * Change collector status to Paused. Invalid if the collector's status is not
 * Running.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function pauseCollector(req, res, next) {
  req.swagger.params.queryBody = {
    value: { status: 'Paused' },
  };
  doPatch(req, res, next, helper);
} // pauseCollector

/**
 * Change collector status from Paused to Running. Invalid if the collector's
 * status is not Paused.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function resumeCollector(req, res, next) {
  req.swagger.params.queryBody = {
    value: { status: 'Running' },
  };
  doPatch(req, res, next, helper);
} // resumeCollector

/**
 * Returns a list of users permitted to modify this collector. DOES NOT use
 * wildcards.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function getCollectorWriters(req, res, next) {
  const resultObj = { reqStartTime: new Date() };
  const params = req.swagger.params;
  const options = {};
  u.findAssociatedInstances(helper,
    params, helper.belongsToManyAssoc.users, options)
  .then((o) => {
    resultObj.dbTime = new Date() - resultObj.reqStartTime;
    const retval = u.responsify(o, helper, req.method);
    u.logAPI(req, resultObj, retval);
    res.status(httpStatus.OK).json(retval);
  })
  .catch((err) => u.handleError(next, err, helper.modelName));
} // getCollectorWriters

/**
 * Add one or more users to a collector's list of authorized writers.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function postCollectorWriters(req, res, next) {
  const params = req.swagger.params;
  const toPost = params.queryBody.value;
  const options = {};
  options.where = u.whereClauseForNameInArr(toPost);
  userProps.model.findAll(options)
  .then((usrs) => {
    doPostAssoc(req, res, next, helper,
      helper.belongsToManyAssoc.users, usrs);
  })
  .catch((err) => u.handleError(next, err, helper.modelName));
} // postCollectorWriters

/**
 * Determine whether a user is an authorized writer for a Collector. If user is
 * unauthorized, there is no writer by this name for this collector.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function getCollectorWriter(req, res, next) {
  const resultObj = { reqStartTime: new Date() };
  const params = req.swagger.params;
  const options = {};
  options.where = u.whereClauseForNameOrId(params.userNameOrId.value);
  u.findAssociatedInstances(helper, params, helper.belongsToManyAssoc.users,
    options)
  .then((o) => {
    resultObj.dbTime = new Date() - resultObj.reqStartTime;

    // throw a ResourceNotFound error if resolved object is empty array
    u.throwErrorForEmptyArray(o, params.userNameOrId.value,
      userProps.modelName);

    // otherwise return the first element of the array
    const retval = u.responsify(o[ZERO], helper, req.method);
    u.logAPI(req, resultObj, retval);
    res.status(httpStatus.OK).json(retval);
  })
  .catch((err) => u.handleError(next, err, helper.modelName));
}

/**
 * Remove a user from a collector’s list of authorized writers.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function deleteCollectorWriter(req, res, next) {
  const userNameOrId = req.swagger.params.userNameOrId.value;
  doDeleteOneAssoc(req, res, next, helper,
      helper.belongsToManyAssoc.users, userNameOrId);
} // deleteCollectorWriter

/**
 * DELETE /collectors/{keys}/writers
 *
 * Deletes all the writers associated with this resource.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 */
function deleteCollectorWriters(req, res, next) {
  doDeleteAllAssoc(req, res, next, helper, helper.belongsToManyAssoc.users);
} // deleteCollectorWriters

module.exports = {
  postCollector,
  findCollectors,
  getCollector,
  patchCollector,
  putCollector,
  deregisterCollector,
  heartbeat,
  startCollector,
  stopCollector,
  pauseCollector,
  resumeCollector,
  getCollectorWriters,
  postCollectorWriters,
  getCollectorWriter,
  deleteCollectorWriter,
  deleteCollectorWriters,
};
