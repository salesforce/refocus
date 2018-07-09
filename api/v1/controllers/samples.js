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
const apiErrors = require('../apiErrors');
const helper = require('../helpers/nouns/samples');
const subHelper = require('../helpers/nouns/subjects');
const doDelete = require('../helpers/verbs/doDelete');
const doGet = require('../helpers/verbs/doGet');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;
const sampleModel = require('../../../cache/models/samples');
const utils = require('./utils');
const publisher = u.publisher;
const realtimeEvents = u.realtimeEvents;
const kueSetup = require('../../../jobQueue/setup');
const kue = kueSetup.kue;
const getSamplesWildcardCacheInvalidation = require('../../../config')
  .getSamplesWildcardCacheInvalidation;
const redisCache = require('../../../cache/redisCache').client.cache;
const RADIX = 10;
const COUNT_HEADER_NAME = require('../constants').COUNT_HEADER_NAME;
const logger = require('winston');

/**
 * Find sample (from redis sample store). If cache is on then cache the
 * response as well.
 *
 * @param {IncomingMessage} req - The request object
 * @param {ServerResponse} res - The response object
 * @param {Function} next - The next middleware function in the stack
 * @param {Object} resultObj - DateTime object for logging
 * @param {String} cacheKey - Cache Key
 * @param {Integer} cacheExpiry -  Cache expiry time
 */
function doFindSample(req, res, next, resultObj, cacheKey, cacheExpiry) {
  sampleModel.findSamples(req, res)
  .then((response) => {
    /*
     * Record the "dbTime" (time spent retrieving the records from the sample
     * store).
     */
    resultObj.dbTime = new Date() - resultObj.reqStartTime;
    /* Add response header with record count. */
    res.set(COUNT_HEADER_NAME, response.length);
    /* Delete any attributes designated for exclusion from the response. */
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
  .catch((err) => {
    // Tracking invalid sample name problems, e.g. missing name
    if (err.name === 'ResourceNotFoundError') {
      logger.error('api/v1/controllers/samples.doFindSample|', err);
    }

    return u.handleError(next, err, helper.modelName);
  });
} // doFindSample

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
   * Finds zero or more samples and sends them back in the response. Sample
   * response for wildcard name query may be cached.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findSamples(req, res, next) {
    // Use cache for wildcard sample query
    const query = req.query.name;
    helper.cacheEnabled = query && (query.indexOf('*') > -1);
    helper.cacheKey = helper.cacheEnabled ? query : null;

    /*
     * Include field list as part of cache key so that we only use a cached
     * response if it has the same field list.
     */
    if (helper.cacheKey && req.query.fields) {
      helper.cacheKey += '|' + req.query.fields;
    }

    helper.cacheExpiry = helper.cacheEnabled ?
      parseInt(getSamplesWildcardCacheInvalidation, RADIX) : null;

    // Check if Sample Store is on or not
    const resultObj = { reqStartTime: req.timestamp }; // for logging
    if (helper.cacheEnabled) {
      redisCache.get(helper.cacheKey, (cacheErr, reply) => {
        if (cacheErr || !reply) {
          doFindSample(req, res, next, resultObj, helper.cacheKey,
            helper.cacheExpiry);
        } else {
          u.logAPI(req, resultObj, reply); // audit log
          res.status(httpStatus.OK).json(JSON.parse(reply));
        }
      });
    } else {
      doFindSample(req, res, next, resultObj);
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
    const resultObj = { reqStartTime: req.timestamp };
    const reqParams = req.swagger.params;
    const jobId = reqParams.key.value;
    kue.Job.get(jobId, (_err, job) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;

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
      u.logAPI(req, resultObj, ret);
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
    const resultObj = { reqStartTime: req.timestamp };
    const requestBody = req.swagger.params.queryBody.value;
    const rLinks = requestBody.relatedLinks;
    if (rLinks) u.checkDuplicateRLinks(rLinks);
    const userName = req.user ? req.user.name : undefined;
    sampleModel.patchSample(req.swagger.params, userName)
    .then((retVal) =>
      u.handleUpdatePromise(resultObj, req, retVal, helper, res))
    .catch((err) => { // e.g. the sample is write protected
      // Tracking invalid sample name problems, e.g. missing name
      if (err.name === 'ResourceNotFoundError') {
        logger.error('api/v1/controllers/samples.patchSample|', err);
      }

      return u.handleError(next, err, helper.modelName);
    });
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
    const resultObj = { reqStartTime: req.timestamp };
    const reqParams = req.swagger.params;
    const toPost = reqParams.queryBody.value;
    utils.noReadOnlyFieldsInReq(req, helper.readOnlyFields);
    u.checkDuplicateRLinks(toPost.relatedLinks);
    sampleModel.postSample(toPost, req.user)
    .then((sample) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      publisher.publishSample(sample, helper.associatedModels.subject,
      realtimeEvents.sample.add, helper.associatedModels.aspect);
      u.logAPI(req, resultObj, sample);
      return res.status(httpStatus.CREATED)
        .json(u.responsify(sample, helper, req.method));
    })
    .catch((err) => {
      // Tracking invalid sample name problems, e.g. missing name
      if (err.name === 'ResourceNotFoundError') {
        logger.error('api/v1/controllers/samples.postSample|', err);
      }

      return u.handleError(next, err, helper.modelName);
    });
  }, // postSample

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
    const resultObj = { reqStartTime: req.timestamp };
    const toPut = req.swagger.params.queryBody.value;
    const rLinks = toPut.relatedLinks;
    if (rLinks) u.checkDuplicateRLinks(rLinks);
    const userName = req.user ? req.user.name : undefined;
    sampleModel.putSample(req.swagger.params, userName)
    .then((retVal) =>
      u.handleUpdatePromise(resultObj, req, retVal, helper, res))
    .catch((err) => {
      // Tracking invalid sample name problems, e.g. missing name
      if (err.name === 'ResourceNotFoundError') {
        logger.error('api/v1/controllers/samples.putSample|', err);
      }

      return u.handleError(next, err, helper.modelName);
    });
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
        sampleModel.upsertSample(sampleQueryBody, user);
      return upsertSamplePromise
      .then((samp) => {
        resultObj.dbTime = new Date() - resultObj.reqStartTime;
        const dataValues = samp.dataValues ? samp.dataValues : samp;

        // loop through remove values to delete property
        if (helper.fieldsToExclude) {
          u.removeFieldsFromResponse(helper.fieldsToExclude, dataValues);
        }

        /*
         * Send the upserted sample to the client by publishing it to the redis
         * channel.
         */
        publisher.publishSample(samp, subHelper.model);

        u.logAPI(req, resultObj, dataValues);
        return res.status(httpStatus.OK)
          .json(u.responsify(samp, helper, req.method));
      });
    }

    return doUpsert(req.user)
    .catch((err) => {
      // Tracking invalid sample name problems, e.g. missing name
      if (err.name === 'ResourceNotFoundError') {
        logger.error('api/v1/controllers/samples.upsertSample|', err);
      }

      return u.handleError(next, err, helper.modelName);
    });
  }, // upsertSample

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
        wrappedBulkUpsertData.reqStartTime = resultObj.reqStartTime;
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
        /*
         * Send the upserted sample to the client by publishing it to the redis
         * channel
         */
        sampleModel.bulkUpsertByName(value, user, readOnlyFields)
        .then((samples) => samples.forEach((sample) => {
          if (!sample.isFailed) {
            publisher.publishSample(sample, subHelper.model);
          }
        }));
        u.logAPI(req, resultObj, body, value.length);
        return Promise.resolve(res.status(httpStatus.OK).json(body));
      }
    } // bulkUpsert

    return bulkUpsert(req.user)
    .catch((err) => u.handleError(next, err, helper.modelName));
  }, // bulkUpsertSample

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
    const userName = req.user ? req.user.name : undefined;
    const delRlinksPromise =
      sampleModel.deleteSampleRelatedLinks(params, userName);

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
