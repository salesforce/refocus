/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/perspectives.js
 */
'use strict';

const helper = require('../helpers/nouns/perspectives');
const userProps = require('../helpers/nouns/users');
const doDeleteManyAssoc =
                    require('../helpers/verbs/doDeleteBelongsToManyAssoc');
const httpStatus = require('../constants').httpStatus;
const u = require('../helpers/verbs/utils');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');

module.exports = {

  /**
   * DELETE /perspectives/{key}
   *
   * Deletes the perspective and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deletePerspective(req, res, next) {
    doDelete(req, res, next, helper);
  },

  /**
   * DELETE /perspectives/{keys}/writers
   *
   * Deletes all the writers associated with this resource.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deletePerspectiveWriters(req, res, next) {
    doDeleteManyAssoc(req, res, next, helper);
  },

  /**
   * GET /perspectives
   *
   * Finds zero or more perspectives and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findPerspectives(req, res, next) {
    doFind(req, res, next, helper);
  },

  /**
   * GET /perspectives/{key}
   *
   * Retrieves the perspective and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getPerspective(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * GET /perspectives/{key}/writers
   *
   * Retrieves all the writers associated with the perspective
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getPerspectiveWriters(req, res, next) {
    const params = req.swagger.params;
    const options = {};
    u.findAssociatedInstances(helper,
      params, helper.belongsToManyAssoc.users, options)
    .then((o) => {
      const retval = u.responsify(o, helper, req.method);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  }, // getPerspectiveWriters

  /**
   * GET /perspectives/{key}/writers/userNameOrId
   *
   * Determine whether a user is an authorized writer for a perspective
   * and returns the user record if so.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getPerspectiveWriter(req, res, next) {
    const params = req.swagger.params;
    const options = {};
    options.where = u.whereClauseForNameOrId(params.userNameOrId.value);
    u.findAssociatedInstances(helper,
      params, helper.belongsToManyAssoc.users, options)
    .then((o) => {
    // if the resolved object is an empty array, throw a ResourceNotFound error
      u.throwErrorForEmptyArray(o,
        params.userNameOrId.value, userProps.modelName);
      const retval = u.responsify(o, helper, req.method);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  }, // getPerspectivesWriter

  /**
   * POST /perspectives/{key}/writers
   *
   * Add one or more users to an perspective’s list of authorized writers
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postPerspectiveWriters(req, res, next) {
    const params = req.swagger.params;
    const toPost = params.queryBody.value;
    const options = {};
    let usersInsts;
    options.where = u.whereClauseForNameInArr(toPost);
    userProps.model.findAll(options)
    .then((usrs) => {
      usersInsts = usrs;
      return u.findByKey(helper, req.swagger.params);
    })
    .then((pers) => pers.addWriters(usersInsts))
    .then((o) => {
      /*
       * The resolved object is either an array of arrays (when
       * writers are added) or just an empty array when no writers are added.
       * The popping is done to get the array from the array of arrays
       */
      let retval = o.length ? o.pop() : o;
      retval = u.responsify(retval, helper, req.method);
      res.status(httpStatus.CREATED).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  }, // postPerspectiveWriters

  /**
   * PATCH /perspectives/{key}
   *
   * Updates the perspective and sends it back in the response. PATCH will
   * only update the attributes of the perspective provided in the body of the
   * request. Other attributes will not be updated.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchPerspective(req, res, next) {
    doPatch(req, res, next, helper);
  },

  /**
   * POST /perspectives
   *
   * Creates a new perspectives and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postPerspective(req, res, next) {
    doPost(req, res, next, helper);
  },

  /**
   * PUT /perspectives/{key}
   *
   * Updates a perspective and sends it back in the response. If any
   * attributes are missing from the body of the request, those attributes are
   * cleared.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  putPerspective(req, res, next) {
    doPut(req, res, next, helper);
  },

}; // exports
