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
'use strict'; // eslint-disable-line strict
const featureToggles = require('feature-toggles');
const utils = require('./utils');
const helper = require('../helpers/nouns/subjects');
const userProps = require('../helpers/nouns/users');
const doDeleteAllAssoc = require('../helpers/verbs/doDeleteAllBToMAssoc');
const doDeleteOneAssoc = require('../helpers/verbs/doDeleteOneBToMAssoc');
const doPostWriters = require('../helpers/verbs/doPostWriters');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doGetWriters = require('../helpers/verbs/doGetWriters');
const doGetHierarchy = require('../helpers/verbs/doGetHierarchy');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;
const apiErrors = require('../apiErrors');
const redisSubjectModel = require('../../../cache/models/subject');
const sampleStore = require('../../../cache/sampleStore');
const sampleStoreConstants = sampleStore.constants;
const sampleStoreFeature = sampleStoreConstants.featureName;
const jobType = require('../../../jobQueue/setup').jobType;
const jobWrapper = require('../../../jobQueue/jobWrapper');
const jobSetup = require('../../../jobQueue/setup');
const WORKER_TTL = 1000 * jobSetup.ttlForJobsSync;
const ZERO = 0;

/**
 * If both parentAbsolutePath and parentId are provided,
 * throws the appropriate error if the
 * parentAbsolutePath does not map to the same subject as parentId.
 * Otherwise call callback function.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {function} callback The function to call if there's
 * no validation to do, or the validation passes
 */
function validateParentFields(req, res, next, callback) {
  const queryBody = req.swagger.params.queryBody.value;
  const { parentId, parentAbsolutePath } = queryBody;

  /*
   * If both parentAbsolutePath and parentId are present, make sure they point
   * to the same subject.
   */
  if (parentId && parentAbsolutePath) {
    helper.model.findOne(
      { where: { absolutePath: { $iLike: parentAbsolutePath } } }
    )
    .then((parent) => {
      if (parent && parent.id !== parentId) {
        // parentAbsolutePath does not match parentId
        throw new apiErrors.ParentSubjectNotMatch({
          message: parent.id + ' does not match ' + parentId,
        });
      } else if (!parent) {
        // no parent found
        throw new apiErrors.ParentSubjectNotFound({
          message: parentAbsolutePath + ' not found.',
        });
      }

      // if parents match
      callback();
    })
    .catch((err) => {
      u.handleError(next, err, helper.modelName);
    });
  } else {
    callback();
  }
}

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
} // validateFilterParams

/**
 * Validates the given fields from request body or url.
 * If fails, throws a corresponding error.
 * @param {Object} requestBody Fields from request body
 * @param {Object} params Fields from url
 */
function validateTags(requestBody, params) {
  let tags = [];
  if (requestBody) {
    tags = requestBody.tags;
  } else if (params) {
    tags = params.tags.value;
  }

  if (tags && tags.length) {
    if (utils.hasDuplicates(tags)) {
      throw new apiErrors.DuplicateFieldError();
    }
  }
} // validateTags

/**
 * Validates the subject request coming in and throws an error if the request
 * does not pass the validation.
 * @param  {Object} req - The request object
 */
function validateRequest(req) {
  utils.noReadOnlyFieldsInReq(req, helper.readOnlyFields);
  validateTags(req.body);
} // validateRequest

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
    const resultObj = { reqStartTime: req.timestamp };
    const params = req.swagger.params;
    u.findByKey(helper, params, ['hierarchy'])
    .then((o) => o.deleteHierarchy())
    .then(() => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
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
    if (featureToggles.isFeatureEnabled(sampleStoreConstants.featureName) &&
      featureToggles.isFeatureEnabled('getSubjectFromCache')) {
      const resultObj = { reqStartTime: req.timestamp }; // for logging
      redisSubjectModel.findSubjects(req, res, resultObj)
      .then((response) => {

        u.logAPI(req, resultObj, response); // audit log
        res.status(httpStatus.OK).json(response);
      })
      .catch((err) => u.handleError(next, err, helper.modelName));
    } else {
      doFind(req, res, next, helper);
    }
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
    if (featureToggles.isFeatureEnabled(sampleStoreConstants.featureName) &&
    featureToggles.isFeatureEnabled('getSubjectFromCache')) {
      const resultObj = { reqStartTime: req.timestamp }; // for logging
      redisSubjectModel.getSubject(req, res, resultObj)
      .then((response) => {

        u.logAPI(req, resultObj, response); // audit log
        res.status(httpStatus.OK).json(response);
      })
      .catch((err) => u.handleError(next, err, helper.modelName));
    } else {
      doGet(req, res, next, helper);
    }
  },

  /**
   * GET /subjects/{key}/hierarchy
   *
   * Retrieves the subject with all its descendents included and sends it back
   * in the response. When "enableWorkerProcess" is enabled, the job is
   * enqueued to be processed by a separate worker process.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getSubjectHierarchy(req, res, next) {
    const params = req.swagger.params;
    const filterParams = ['subjectTags', 'aspectTags', 'aspect', 'status'];

    // Filter Parameter Validation
    for (let i = 0; i < filterParams.length; i++) {
      if (params[filterParams[i]].value) {
        validateFilterParams(params[filterParams[i]].value.split(','));
      }
    }

    const resultObj = {
      reqStartTime: Date.now(),
      params: params,
    };

    if (featureToggles.isFeatureEnabled('enableWorkerProcess')
    && featureToggles.isFeatureEnabled('enqueueHierarchy')) {
      jobWrapper.createJob(jobType.GET_HIERARCHY, resultObj, req)
      .ttl(WORKER_TTL)
      .on('complete', (resultObj) => {
        u.logAPI(req, resultObj, resultObj.retval);
        res.status(httpStatus.OK).json(resultObj.retval);
      })
      .on('failed', (errString) => {
        let parsedErr;
        try {
          parsedErr = JSON.parse(errString);
        } catch (e) {
          parsedErr = null;
        }

        let newErr;
        if (parsedErr) { //errString contains a serialized error object.

          //create a new error object of the correct type
          if (apiErrors[parsedErr.name]) {
            newErr = new apiErrors[parsedErr.name]();
          } else if (global[parsedErr.name]) {
            newErr = new global[parsedErr.name]();
          } else {
            newErr = new Error();
          }

          //copy props to new error
          Object.keys(parsedErr).forEach((prop) => {
            if (!newErr.hasOwnProperty(prop)
            || Object.getOwnPropertyDescriptor(newErr, prop).writable) {
              newErr[prop] = parsedErr[prop];
            }
          });

        } else { //errString contains an error message.
          if (errString === 'TTL exceeded') {
            newErr = new apiErrors.WorkerTimeoutError();
          } else {
            newErr = new Error(errString);
          }
        }

        u.handleError(next, newErr, helper.modelName);
      });
    } else {
      doGetHierarchy(resultObj)
      .then((resultObj) => {
        u.logAPI(req, resultObj, resultObj.retval);
        res.status(httpStatus.OK).json(resultObj.retval);
      })
      .catch((err) => {
        u.handleError(next, err, helper.modelName);
      });
    }
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
    doGetWriters.getWriters(req, res, next, helper);
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
    doGetWriters.getWriter(req, res, next, helper);
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
    doPostWriters(req, res, next, helper);
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
    validateRequest(req);
    validateParentFields(req, res, next,
    () => {
      doPatch(req, res, next, helper);
    });
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
    validateRequest(req);
    const { name, parentId, parentAbsolutePath } =
      req.swagger.params.queryBody.value;

    /*
     * if cache is on AND parentId
     * is not provided, check whether the subject exists in cache.
     * Else if parentId is provided OR cache is off,
     * do normal post.
     */
    if (featureToggles.isFeatureEnabled(sampleStoreConstants.featureName) &&
      featureToggles.isFeatureEnabled('getSubjectFromCache') &&
      !u.looksLikeId(parentId)) {
      const absolutePath = parentAbsolutePath ?
        (parentAbsolutePath + '.' + name) : name;
      redisSubjectModel.subjectInSampleStore(absolutePath)
      .then((found) => {
        if (found) {
          throw new apiErrors.DuplicateResourceError(
            'The subject lower case absolutePath must be unique');
        }

        doPost(req, res, next, helper);
      })
      .catch((err) => {
        u.handleError(next, err, helper.modelName);
      });
    } else {
      doPost(req, res, next, helper);
    }
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
    validateRequest(req);
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
   * Updates an subject and sends it back in the response.
   * Validates parentId and parentAbsolutePath.
   * If any attributes
   * are missing from the body of the request, those attributes are cleared.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  putSubject(req, res, next) {
    validateRequest(req);
    validateParentFields(req, res, next,
    () => {
      doPut(req, res, next, helper);
    });
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
    const resultObj = { reqStartTime: req.timestamp };
    const params = req.swagger.params;
    u.findByKey(helper, params)
    .then((o) => u.isWritable(req, o))
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
    const resultObj = { reqStartTime: req.timestamp };
    const params = req.swagger.params;
    u.findByKey(helper, params)
    .then((o) => u.isWritable(req, o))
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
      const retval = u.responsify(o, helper, req.method);
      u.logAPI(req, resultObj, retval);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },
}; // exports
