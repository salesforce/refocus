/**
 * api/v1/controllers/samples.js
 */
'use strict';

const helper = require('../helpers/nouns/samples');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;
const logAPI = require('../../../utils/loggingUtil').logAPI;

module.exports = {

  /**
   * DELETE /samples/{key}
   *
   * Deletes the sample and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteSample(req, res, next) {
    doDelete(req, res, next, helper);
  },

  /**
   * GET /samples
   *
   * Finds zero or more samples and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findSamples(req, res, next) {
    doFind(req, res, next, helper);
  },

  /**
   * GET /samples/{key}
   *
   * Retrieves the sample and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getSample(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * PATCH /samples/{key}
   *
   * Updates the sample and sends it back in the response. PATCH will only
   * update the attributes of the sample provided in the body of the request.
   * Other attributes will not be updated.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchSample(req, res, next) {
    doPatch(req, res, next, helper);
  },

  /**
   * POST /samples
   *
   * Creates a new sample and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postSample(req, res, next) {
    doPost(req, res, next, helper);
  },

  /**
   * PUT /samples/{key}
   *
   * Updates a sample and sends it back in the response. If any attributes
   * are missing from the body of the request, those attributes are cleared.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  putSample(req, res, next) {
    doPut(req, res, next, helper);
  },

  /**
   * POST /samples/upsert
   *
   * Updates existing sample if one already exists with the name specified in
   * the request body. If no sample exists with that name, creates a new
   * sample. Sends the new/updated sample back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  upsertSample(req, res, next) {
    helper.model.upsertByName(req.swagger.params.queryBody.value)
    .then((o) => {
      if (helper.loggingEnabled) {
        logAPI(req, helper.modelName, o);
      }

      return res.status(httpStatus.OK).json(u.responsify(o, helper, req.method));
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * POST /samples/upsert/bulk
   *
   * Upserts multiple samples. Response will contain the number of successful
   * upserts, the number of failed upserts, and an array of errors for the
   * failed upserts.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  bulkUpsertSample(req, res, next) {
    // UNPROMISIFY THIS FUNCTION TO RETURN THE RESPONSE IMMEDIATELY!

    /*
      const retval = {
        successCount: 0,
        failureCount: 0,
        errors: [],
      };
    */

    helper.model.bulkUpsertByName(req.swagger.params.queryBody.value);
    if (helper.loggingEnabled) {
      logAPI(req, helper.modelName);
    }

    res.sendStatus(httpStatus.OK);

    /*
      .each((o) => {
        if (util.isError(o)) {
          retval.failureCount++;
          retval.errors.push(o);
        } else {
          retval.successCount++;
        }
      })
      .then((o) => res.status(200).json(retval)) // TODO add apiLinks!
      .catch((err) => u.handleError(next, err, helper.modelName));
    */
  },

  /**
   * DELETE /v1/samples/{key}/relatedLinks/
   * DELETE /v1/samples/{key}/relatedLinks/{akey}
   *
   * Deletes the specified/all related link from the samples and sends updated
   * samples in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteSampleRelatedLinks(req, res, next) {
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
        logAPI(req, 'SampleRelatedLinks', o);
      }

      const retval = u.responsify(o, helper, req.method);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

}; // exports
