/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/samples.js
 */
'use strict'; // eslint-disable-line strict

const featureToggles = require('feature-toggles');

const helper = require('../helpers/nouns/samples');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;
const sampleStore = require('../../../cache/sampleStore');
const constants = sampleStore.constants;
const redisModelSample = require('../../../cache/models/samples');

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
    if (featureToggles.isFeatureEnabled(constants.featureName)) {
      const resultObj = { reqStartTime: new Date() }; // for logging
      redisModelSample.findSamplesFromRedis(
        resultObj, res.method, req.swagger.params
      )
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
   * GET /samples/{key}
   *
   * Retrieves the sample and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getSample(req, res, next) {
    if (featureToggles.isFeatureEnabled(constants.featureName)) {
      const resultObj = { reqStartTime: new Date() }; // for logging
      const sampleName = req.swagger.params.key.value.toLowerCase();

      redisModelSample.getSampleFromRedis(
        sampleName, resultObj, res.method, req.swagger.params
      )
      .then((sampleRes) => {
        u.logAPI(req, resultObj, sampleRes); // audit log
        res.status(httpStatus.OK).json(sampleRes);
      })
      .catch((err) => u.handleError(next, err, helper.modelName));
    } else {
      doGet(req, res, next, helper);
    }
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
    const resultObj = { reqStartTime: new Date() };
    u.getUserNameFromToken(req,
      featureToggles.isFeatureEnabled('enforceWritePermission'))
    .then((userName) =>
      helper.model.upsertByName(req.swagger.params.queryBody.value, userName)
    )
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      u.logAPI(req, resultObj, o.dataValues);
      return res.status(httpStatus.OK)
        .json(u.responsify(o, helper, req.method));
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * POST /samples/upsert/bulk
   *
   * Upserts multiple samples. Returns "OK" without waiting for the upserts to
   * happen. When "useWorkerProcess" is enabled, the bulk upsert is enqueued
   * to be processed by a separate worker process.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @returns {ServerResponse} - The response object indicating merely that the
   *  bulk upsert request has been received.
   */
  bulkUpsertSample(req, res/* , next */) {
    const resultObj = { reqStartTime: new Date() };
    const reqStartTime = Date.now();
    const value = req.swagger.params.queryBody.value;
    u.getUserNameFromToken(req,
      featureToggles.isFeatureEnabled('enforceWritePermission'))
    .then((userName) => {
      if (featureToggles.isFeatureEnabled('useWorkerProcess')) {
        const jobType = require('../../../jobQueue/setup').jobType;
        const jobWrapper = require('../../../jobQueue/jobWrapper');

        const wrappedBulkUpsertData = {};
        wrappedBulkUpsertData.upsertData = value;
        wrappedBulkUpsertData.userName = userName;
        wrappedBulkUpsertData.reqStartTime = reqStartTime;

        const j = jobWrapper.createJob(jobType.BULKUPSERTSAMPLES,
          wrappedBulkUpsertData, req);
      } else {
        helper.model.bulkUpsertByName(value,
          userName);
      }
    });

    const body = { status: 'OK' };
    u.logAPI(req, resultObj, body, value.length);
    return res.status(httpStatus.OK).json(body);
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

      const retval = u.responsify(o, helper, req.method);
      u.logAPI(req, resultObj, retval);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

}; // exports
