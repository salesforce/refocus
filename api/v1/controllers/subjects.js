/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/subjects.js
 */
'use strict';

const helper = require('../helpers/nouns/subjects');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;
const apiErrors = require('../apiErrors');
const logAPI = require('../../../utils/loggingUtil').logAPI;

module.exports = {

  /**
   * DELETE /subjects/{key}
   *
   * Deletes the subject and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteSubject(req, res, next) {
    doDelete(req, res, next, helper);
  },

  /**
   * DELETE /subjects/{key}/hierarchy
   *
   * Deletes the subject and all its descendents.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteSubjectHierarchy(req, res, next) {
    const params = req.swagger.params;
    u.findByKey(helper, params, ['hierarchy'])
    .then((o) => o.deleteHierarchy())
    .then(() => {
      if (helper.loggingEnabled) {
        logAPI(req, 'SubjectHierarchy');
      }

      return res.status(httpStatus.OK).json({});
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * GET /subjects
   *
   * Finds zero or more subjects and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findSubjects(req, res, next) {
    doFind(req, res, next, helper);
  },

  /**
   * GET /subjects/{key}
   *
   * Retrieves the subject and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getSubject(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * GET /subjects/{key}/hierarchy
   *
   * Retrieves the subject with all its descendents included and sends it back
   * in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getSubjectHierarchy(req, res, next) {
    const params = req.swagger.params;
    const depth = Number(params.depth.value);

    u.findByKey(helper, params, ['hierarchy', 'samples'])
    .then((o) => {
      let retval = u.responsify(o, helper, req.method);
      if (depth > 0) {
        retval = helper.deleteChildren(retval, depth);
      }

      retval = helper.modifyAPIResponse(retval, params);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  }, // getSubjectHierarchy

  /**
   * PATCH /subjects/{key}
   *
   * Updates the subject and sends it back in the response. PATCH will only
   * update the attributes of the subject provided in the body of the request.
   * Other attributes will not be updated.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchSubject(req, res, next) {
    if (req.body.absolutePath) {
      throw new apiErrors.SubjectValidationError;
    }

    doPatch(req, res, next, helper);
  },

  /**
   * POST /subjects
   *
   * Creates a new subject and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postSubject(req, res, next) {
    if (req.body.absolutePath) {
      throw new apiErrors.SubjectValidationError;
    }

    doPost(req, res, next, helper);
  },

  /**
   * POST /subjects/{key}/child
   *
   * Creates a new child subject under the specified parent, and sends it back
   * in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postChildSubject(req, res, next) {
    const key = req.swagger.params.key.value;
    if (u.looksLikeId(key)) {
      req.swagger.params.queryBody.value.parentId = key;
      doPost(req, res, next, helper);
    } else {
      u.findByKey(helper, req.swagger.params)
      .then((o) => {
        req.swagger.params.queryBody.value.parentId = o.id;
        doPost(req, res, next, helper);
      })
      .catch((err) => u.handleError(next, err, helper.modelName));
    }
  },

  /**
   * PUT /subjects/{key}
   *
   * Updates an subject and sends it back in the response. If any attributes
   * are missing from the body of the request, those attributes are cleared.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  putSubject(req, res, next) {
    if (req.body.absolutePath) {
      throw new apiErrors.SubjectValidationError;
    }

    doPut(req, res, next, helper);
  },

  /**
   * DELETE /v1/subjects/{key}/tags/
   * DELETE /v1/subjects/{key}/tags/{akey}
   *
   * Deletes specified/all tags from the subject and sends updated subject
   * in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteSubjectTags(req, res, next) {
    const params = req.swagger.params;
    u.findByKey(helper, params)
    .then((o) => {
      let updatedTagArray = [];
      if (params.tagName) {
        updatedTagArray =
          u.deleteArrayElement(o.tags, params.tagName.value);
      }

      return o.update({ tags: updatedTagArray });
    })
    .then((o) => {
      if (helper.loggingEnabled) {
        logAPI(req, 'SubjectTags', o);
      }

      const retval = u.responsify(o, helper, req.method);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * DELETE /v1/subjects/{key}/relatedLinks/
   * DELETE /v1/subjects/{key}/relatedLinks/{name}
   *
   * Deletes specified/all related links from the subject and sends updated
   * subject in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteSubjectRelatedLinks(req, res, next) {
    const params = req.swagger.params;
    u.findByKey(helper, params)
    .then((o) => {
      let jsonData = [];
      if (params.relName) {
        jsonData =
          u.deleteAJsonArrayElement(o.relatedLinks, params.relName.value);
      }

      return o.update({ relatedLinks: jsonData });
    })
    .then((o) => {
      if (helper.loggingEnabled) {
        logAPI(req, 'SubjectRelatedLinks', o);
      }

      const retval = u.responsify(o, helper, req.method);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },
}; // exports
