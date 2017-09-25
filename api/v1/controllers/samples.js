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
const authUtils = require('../helpers/authUtils');
const apiErrors = require('../apiErrors');
const helper = require('../helpers/nouns/samples');
const subHelper = require('../helpers/nouns/subjects');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;
const sampleStore = require('../../../cache/sampleStore');
const sampleStoreConstants = sampleStore.constants;
const redisModelSample = require('../../../cache/models/samples');
const utils = require('./utils');
const publisher = u.publisher;
const kueSetup = require('../../../jobQueue/setup');
const kue = kueSetup.kue;
const getSamplesWildcardCacheInvalidation = require('../../../config')
  .getSamplesWildcardCacheInvalidation;
const redisCache = require('../../../cache/redisCache').client.cache;

/**
 * Find sample from samplestore. If cache is on then
 * cache the response as well.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Object} resultObj - DateTime object for logging
 * @param {String} cacheKey - Cache Key
 * @param {Integer} cacheExpiry -  Cache expiry time
 */
function doFindSampleStoreResponse(req, res, next, resultObj, cacheKey, cacheExpiry) {
  redisModelSample.findSamples(req, res, resultObj)
  .then((response) => {
    // loop through remove values to delete property
    if (helper.fieldsToExclude) {
      for (let i = response.length - 1; i >= 0; i--) {
        u.removeFieldsFromResponse(helper.fieldsToExclude, response[i]);
      }
    }

    if (cacheKey) {
      // cache the object by cacheKey.
      const strObj = JSON.stringify(response);
      redisCache.setex(cacheKey, cacheExpiry, strObj);
    }

    u.logAPI(req, resultObj, response); // audit log
    res.status(httpStatus.OK).json(response);
  })
  .catch((err) => u.handleError(next, err, helper.modelName));
}

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
    // Check if Cache is on for Wildcard Sample query
    if (featureToggles.isFeatureEnabled('cacheGetSamplesByNameWildcard')) {
      const query = req.query.name;
      helper.cacheEnabled = query && (query.indexOf('*') > -1);
      helper.cacheKey =  helper.cacheEnabled ? query : null;
      helper.cacheExpiry = helper.cacheEnabled ?
        parseInt(getSamplesWildcardCacheInvalidation) : null;
    }

    // Check if Sample Store is on or not
    if (featureToggles.isFeatureEnabled(sampleStoreConstants.featureName)) {
      const resultObj = { reqStartTime: req.timestamp }; // for logging
      if (helper.cacheEnabled) {
        redisCache.get(helper.cacheKey, (cacheErr, reply) => {
          if (cacheErr || !reply) {
            doFindSampleStoreResponse(req, res,
             next, resultObj, helper.cacheKey, helper.cacheExpiry);
          } else {
            u.logAPI(req, resultObj, reply); // audit log
            res.status(httpStatus.OK).json(JSON.parse(reply));
          }
        });
      } else {
        doFindSampleStoreResponse(req, res,
          next, resultObj);
      }
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
    doGet(req, res, next, helper);
  },

  /**
   * GET /samples/upsert/bulk/{key}/status
   *
   * Retrieves the status of the bulk upsert job and sends it back in the
   * response
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getSampleBulkUpsertStatus(req, res, next) {
    const reqParams = req.swagger.params;
    const jobId = reqParams.key.value;
    kue.Job.get(jobId, (_err, job) => {
      /*
       * throw the "ResourceNotFoundError" if there is an error in getting the
       * job or the job is not a bulkUpsert job
       */
      if (_err || !job || job.type !== kueSetup.jobType.BULKUPSERTSAMPLES) {
        const err = new apiErrors.ResourceNotFoundError();
        return u.handleError(next, err, helper.modelName);
      }

      // return the job status and the errors in the response
      const ret = {};
      ret.status = job._state;
      ret.errors = job.result ? job.result.errors : [];
      return res.status(httpStatus.OK).json(ret);
    });
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
    utils.noReadOnlyFieldsInReq(req, helper.readOnlyFields);
    if (featureToggles.isFeatureEnabled(sampleStoreConstants.featureName)) {
      const resultObj = { reqStartTime: new Date() };
      const requestBody = req.swagger.params.queryBody.value;
      const rLinks = requestBody.relatedLinks;
      if (rLinks) {
        u.checkDuplicateRLinks(rLinks);
      }

      u.getUserNameFromToken(req)
      .then((user) => redisModelSample.patchSample(req.swagger.params, user))
      .then((retVal) => u.handleUpdatePromise(resultObj, req, retVal, helper, res))
      .catch((err) => // the sample is write protected
        u.handleError(next, err, helper.modelName)
      );
    } else {
      doPatch(req, res, next, helper);
    }
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
    utils.noReadOnlyFieldsInReq(req, helper.readOnlyFields);
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
    utils.noReadOnlyFieldsInReq(req, helper.readOnlyFields);
    if (featureToggles.isFeatureEnabled(sampleStoreConstants.featureName)) {
      const resultObj = { reqStartTime: req.timestamp };
      const toPut = req.swagger.params.queryBody.value;
      const rLinks = toPut.relatedLinks;
      if (rLinks) {
        u.checkDuplicateRLinks(rLinks);
      }

      u.getUserNameFromToken(req)
      .then((user) => redisModelSample.putSample(req.swagger.params, user))
      .then((retVal) => u.handleUpdatePromise(resultObj, req, retVal, helper, res))
      .catch((err) => u.handleError(next, err, helper.modelName));
    } else {
      doPut(req, res, next, helper);
    }
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
   * @returns {Promise} - A promise that resolves to the response object
   * indicating that the sample has been either created or updated.
   */
  upsertSample(req, res, next) {
    // make the name post-able
    const readOnlyFields = helper
      .readOnlyFields.filter((field) => field !== 'name');
    utils.noReadOnlyFieldsInReq(req, readOnlyFields);
    const resultObj = { reqStartTime: req.timestamp };
    const sampleQueryBody = req.swagger.params.queryBody.value;

    /**
     * Call the appropriate upsert and return a response.
     *
     * @param {Object} user object. Optional.
     * @returns {Promise} A Promise that resolves to the response object or a
     * ValidationError
     */
    function doUpsert(user) {
      if (sampleQueryBody.relatedLinks) {
        try {
          u.checkDuplicateRLinks(sampleQueryBody.relatedLinks);
        } catch (err) {
          return Promise.reject(err);
        }
      }

      const upsertSamplePromise =
          featureToggles.isFeatureEnabled(sampleStoreConstants.featureName) ?
          redisModelSample.upsertSample(
              sampleQueryBody, user) :
          helper.model.upsertByName(sampleQueryBody, user);

      return upsertSamplePromise
      .then((samp) => {
        resultObj.dbTime = new Date() - resultObj.reqStartTime;
        const dataValues = samp.dataValues ? samp.dataValues : samp;

        // loop through remove values to delete property
        if (helper.fieldsToExclude) {
          u.removeFieldsFromResponse(helper.fieldsToExclude, dataValues);
        }

        /*
         *send the upserted sample to the client by publishing it to the redis
         *channel
         */
        if (featureToggles.isFeatureEnabled('publishPartialSample')) {
          publisher.publishPartialSample(samp);
        } else {
          publisher.publishSample(samp, subHelper.model);
        }

        u.logAPI(req, resultObj, dataValues);
        return res.status(httpStatus.OK)
          .json(u.responsify(samp, helper, req.method));
      });
    }

    return authUtils.getUser(req)
    .then((user) => // upsert with found user
      doUpsert(user)
      .catch((err) => // user does not have write permission for the sample
        u.handleError(next, err, helper.modelName)
      )
    )
    .catch(() => // user is not found. upsert anyway with no user
      doUpsert(false)
      .catch((err) => // the sample is write protected
        u.handleError(next, err, helper.modelName)
      )
    );
  },

  /**
   * POST /samples/upsert/bulk
   *
   * Upserts multiple samples. Returns "OK" without waiting for the upserts to
   * happen. When "enableWorkerProcess" is set to true, the bulk upsert is
   * enqueued to be processed by a separate worker process and the response
   * is returned with a job id.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   * @returns {Promise} - A promise that resolves to the response object,
   * indicating merely that the bulk upsert request has been received.
   */
  bulkUpsertSample(req, res, next) {
    const resultObj = { reqStartTime: req.timestamp };
    const reqStartTime = Date.now();
    const value = req.swagger.params.queryBody.value;
    const body = { status: 'OK' };
    const readOnlyFields = helper.readOnlyFields.filter((field) =>
      field !== 'name');

    /**
     * Performs bulk upsert through worker, cache, or db model.
     * Works regardless of whether user if provided or not.
     *
     * @param {Object} user Sequelize result. Optional
     * @returns {Promise} a promise that resolves to the response object
     * with status and body
     */
    function bulkUpsert(user) {
      if (featureToggles.isFeatureEnabled('enableWorkerProcess')) {

        const jobType = require('../../../jobQueue/setup').jobType;
        const jobWrapper = require('../../../jobQueue/jobWrapper');

        const wrappedBulkUpsertData = {};
        wrappedBulkUpsertData.upsertData = value;
        wrappedBulkUpsertData.user = user;
        wrappedBulkUpsertData.reqStartTime = reqStartTime;
        wrappedBulkUpsertData.readOnlyFields = readOnlyFields;

        const jobPromise = jobWrapper
          .createPromisifiedJob(jobType.BULKUPSERTSAMPLES,
            wrappedBulkUpsertData, req);
        return jobPromise.then((job) => {
          // set the job id in the response object before it is returned
          body.jobId = job.id;
          u.logAPI(req, resultObj, body, value.length);
          return res.status(httpStatus.OK).json(body);
        })
        .catch((err) => u.handleError(next, err, helper.modelName));
      } else {
        const sampleModel =
        featureToggles.isFeatureEnabled(sampleStoreConstants.featureName) ?
          redisModelSample : helper.model;

        /*
         * Send the upserted sample to the client by publishing it to the redis
         * channel
         */
        sampleModel.bulkUpsertByName(value, user, readOnlyFields)
        .then((samples) => {
          samples.forEach((sample) => {
            if (!sample.isFailed) {
              if (featureToggles.isFeatureEnabled('publishPartialSample')) {
                publisher.publishPartialSample(sample);
              } else {
                publisher.publishSample(sample, subHelper.model);
              }
            }
          });
        });
        u.logAPI(req, resultObj, body, value.length);
        return Promise.resolve(res.status(httpStatus.OK).json(body));
      }
    }

    return authUtils.getUser(req)
    .then((user) => // upsert with found user
      bulkUpsert(user)
      .catch((err) => // user does not have write permission for the sample
        u.handleError(next, err, helper.modelName)
      )
    ).catch(() => // user is not found. upsert anyway with no user
      bulkUpsert(false)
      .catch((err) => // the sample is write protected
        u.handleError(next, err, helper.modelName)
      )
    );
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
    const resultObj = { reqStartTime: req.timestamp };
    const params = req.swagger.params;
    let delRlinksPromise;
    if (featureToggles.isFeatureEnabled(sampleStoreConstants.featureName)) {
      delRlinksPromise = u.getUserNameFromToken(req)
      .then((user) => redisModelSample.deleteSampleRelatedLinks(params, user));
    } else {
      delRlinksPromise = u.findByKey(helper, params)
        .then((o) => u.isWritable(req, o))
        .then((o) => {
          let jsonData = [];
          if (params.relName) {
            jsonData =
              u.deleteAJsonArrayElement(o.relatedLinks, params.relName.value);
          }

          return o.update({ relatedLinks: jsonData });
        });
    }

    delRlinksPromise.then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      const retval = u.responsify(o, helper, req.method);

      // loop through remove values to delete property
      if (helper.fieldsToExclude) {
        u.removeFieldsFromResponse(helper.fieldsToExclude, retval);
      }

      /* send the updated sample to the client by publishing it to the redis
      channel */
      publisher.publishSample(
        o, helper.associatedModels.subject, u.realtimeEvents.sample.upd,
        helper.associatedModels.aspect
      );

      u.logAPI(req, resultObj, retval);
      res.status(httpStatus.OK).json(retval);
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

}; // exports
