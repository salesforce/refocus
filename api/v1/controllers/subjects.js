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

const featureToggles = require('feature-toggles');
const utils = require('./utils');
const helper = require('../helpers/nouns/subjects');
const userProps = require('../helpers/nouns/users');
const doDeleteAllAssoc =
                    require('../helpers/verbs/doDeleteAllBToMAssoc');
const doDeleteOneAssoc =
                    require('../helpers/verbs/doDeleteOneBToMAssoc');
const doPostAssoc =
                    require('../helpers/verbs/doPostBToMAssoc');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;
const apiErrors = require('../apiErrors');
const logAuditAPI = require('../../../utils/loggingUtil').logAuditAPI;
const ZERO = 0;
const ONE = 1;

/**
 * Validates the correct filter parameter
 * passed in query parameters
 * @param {Array} filterParams Filter Tags Array
 */
function validateFilterParams(filterParams) {
  let subjectTagsCounter = 0;
  const EXCLUDE_SYMBOL = '-';

  subjectTagsCounter = filterParams
    .filter((i) => i.startsWith(EXCLUDE_SYMBOL)).length;

  if (subjectTagsCounter !== ZERO &&
    filterParams.length !== subjectTagsCounter) {
    throw new apiErrors.InvalidFilterParameterError();
  }
}

/**
 * Validates the given fields from request body or url.
 * If fails, throws a corresponding error.
 * @param {Object} requestBody Fields from request body
 * @param {Object} params Fields from url
 */
function validateTags(requestBody, params) {
  let absolutePath = '';
  let tags = [];
  if (requestBody) {
    tags = requestBody.tags;
    absolutePath = requestBody.absolutePath;
  } else if (params) {
    // params.tags.value is a comma delimited string, not empty.
    tags = params.tags.value ? params.tags.value.split(',') : [];
  }

  if (absolutePath) {
    throw new apiErrors.SubjectValidationError();
  }

  if (tags && tags.length) {
    if (utils.hasDuplicates(tags)) {
      throw new apiErrors.DuplicateFieldError();
    }
  }
}

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
    const resultObj = { reqStartTime: new Date() };
    const params = req.swagger.params;
    u.findByKey(helper, params, ['hierarchy'])
    .then((o) => o.deleteHierarchy())
    .then(() => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      if (helper.loggingEnabled) {
        logAuditAPI(req, 'SubjectHierarchy');
      }

      u.logAPI(req, resultObj, {});
      return res.status(httpStatus.OK).json({});
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * DELETE /subjects/{keys}/writers
   *
   * Deletes all the writers associated with this resource.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteSubjectWriters(req, res, next) {
    doDeleteAllAssoc(req, res, next, helper, helper.belongsToManyAssoc.users);
  },

  /**
   * DELETE /subjects/{keys}/writers/userNameOrId
   *
   * Deletes a user from an perspective’s list of authorized writers.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteSubjectWriter(req, res, next) {
    const userNameOrId = req.swagger.params.userNameOrId.value;
    doDeleteOneAssoc(req, res, next, helper,
        helper.belongsToManyAssoc.users, userNameOrId);
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
    validateTags(null, req.swagger.params);
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
    const resultObj = { reqStartTime: new Date() };
    const params = req.swagger.params;
    const depth = Number(params.depth.value);
    const filterParams = ['subjectTags', 'aspectTags', 'aspect', 'status'];

    // Filter Parameter Validation
    for (let i = 0; i < filterParams.length; i++) {
      if (params[filterParams[i]].value) {
        validateFilterParams(params[filterParams[i]].value.split(','));
      }
    }

    u.findByKey(helper, params, ['hierarchy', 'samples'])
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      let retval = u.responsify(o, helper, req.method);
      if (depth > ZERO) {
        retval = helper.deleteChildren(retval, depth);
      }

      retval = helper.modifyAPIResponse(retval, params);
      u.logAPI(req, resultObj, retval);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  }, // getSubjectHierarchy

  /**
   * GET /subjects/{key}/writers
   *
   * Retrieves all the writers associated with the aspect
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getSubjectWriters(req, res, next) {
    const resultObj = { reqStartTime: new Date() };
    const params = req.swagger.params;
    const options = {};
    u.findAssociatedInstances(helper,
      params, helper.belongsToManyAssoc.users, options)
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      const retval = u.responsify(o, helper, req.method);
      u.logAPI(req, resultObj, o.dataValues);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  }, // getSubjectWriters

  /**
   * GET /subjects/{key}/writers/userNameOrId
   *
   * Determine whether a user is an authorized writer for a subject and returns
   * the user record if so.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getSubjectWriter(req, res, next) {
    const resultObj = { reqStartTime: new Date() };
    const params = req.swagger.params;
    const options = {};
    options.where = u.whereClauseForNameOrId(params.userNameOrId.value);
    u.findAssociatedInstances(helper,
      params, helper.belongsToManyAssoc.users, options)
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;

      // throw ResourceNotFound error if resolved object is empty array
      u.throwErrorForEmptyArray(o,
        params.userNameOrId.value, userProps.modelName);
      const retval = u.responsify(o, helper, req.method);
      u.logAPI(req, resultObj, retval);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  }, // getSubjectWriter

  /**
   * POST /subjects/{key}/writers
   *
   * Add one or more users to an subject’s list of authorized writers
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postSubjectWriters(req, res, next) {
    const params = req.swagger.params;
    const toPost = params.queryBody.value;
    const options = {};
    options.where = u.whereClauseForNameInArr(toPost);
    userProps.model.findAll(options)
    .then((usrs) => {
      doPostAssoc(req, res, next, helper,
        helper.belongsToManyAssoc.users, usrs);
    });
  }, // postSubjectWriters

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
    validateTags(req.body);
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
    validateTags(req.body);
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
    validateTags(req.body);
    doPut(req, res, next, helper);
  },

  /**
   * DELETE /v1/subjects/{key}/tags/
   * DELETE /v1/subjects/{key}/tags/{tagName}
   *
   * Deletes specified/all tags from the subject and sends updated subject
   * in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteSubjectTags(req, res, next) {
    const resultObj = { reqStartTime: new Date() };
    const params = req.swagger.params;
    u.findByKey(helper, params)
    .then((o) => u.isWritable(req, o,
        featureToggles.isFeatureEnabled('enforceWritePermission')))
    .then((o) => {
      let updatedTagArray = [];
      if (params.tagName) {
        updatedTagArray =
          u.deleteArrayElement(o.tags, params.tagName.value);
      }

      return o.update({ tags: updatedTagArray });
    })
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      if (helper.loggingEnabled) {
        logAuditAPI(req, 'SubjectTags', o);
      }

      const retval = u.responsify(o, helper, req.method);
      u.logAPI(req, resultObj, retval);
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
    const resultObj = { reqStartTime: new Date() };
    const params = req.swagger.params;
    u.findByKey(helper, params)
    .then((o) => u.isWritable(req, o,
        featureToggles.isFeatureEnabled('enforceWritePermission')))
    .then((o) => {
      let jsonData = [];
      if (params.relName) {
        jsonData =
          u.deleteAJsonArrayElement(o.relatedLinks, params.relName.value);
      }

      return o.update({ relatedLinks: jsonData });
    })
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      if (helper.loggingEnabled) {
        logAuditAPI(req, 'SubjectRelatedLinks', o);
      }

      const retval = u.responsify(o, helper, req.method);
      u.logAPI(req, resultObj, retval);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },
}; // exports
