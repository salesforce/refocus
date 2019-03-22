/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/events.js
 */
'use strict';

const featureToggles = require('feature-toggles');
const apiErrors = require('../apiErrors');
const config = require('../../../config.js');
const helper = require('../helpers/nouns/events');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPost = require('../helpers/verbs/doPost');
const u = require('../helpers/verbs/utils');
const activityLogUtil = require('../../../utils/activityLog');
const httpStatus = require('../constants').httpStatus;
const DEFAULT_LIMIT = config.botEventLimit;
const roomModel = require('../helpers/nouns/rooms').model;
const roomTypeModel = require('../helpers/nouns/roomTypes').model;

const kueSetup = require('../../../jobQueue/setup');
const kue = kueSetup.kue;

module.exports = {

  /**
   * GET /events
   *
   * Finds zero or more events and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findEvents(req, res, next) {
    if (!req.swagger.params.limit.value) {
      req.swagger.params.limit.value = DEFAULT_LIMIT;
    }

    // Extracting type from params to filter by context.type
    if (req.swagger.params.type && req.swagger.params.type.value) {
      req.swagger.params.context = {
        value: {
          type: req.swagger.params.type.value,
        },
      };

      delete req.swagger.params.type;
    }

    doFind(req, res, next, helper);
  },

  /**
   * GET /events/{key}
   *
   * Retrieves the event and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getEvent(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * POST /events
   *
   * Creates a new event and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postEvents(req, res, next) {
    const resultObj = { reqStartTime: req.timestamp };
    const reqObj = req.swagger.params.queryBody.value;

    u.setOwner(reqObj, req)
      .then(() => helper.model.create(reqObj))
      .then((o) => o.reload())
      .then((o) => {
        resultObj.dbTime = new Date() - resultObj.reqStartTime +'ms';
        u.logAPI(req, resultObj, o.dataValues);
        if (featureToggles.isFeatureEnabled('enableEventActivityLogs')) {
          resultObj.user = req.headers.UserName;
          resultObj.token = req.headers.TokenName;
          resultObj.actionId = o.botActionId || 'None';
          resultObj.ipAddress = activityLogUtil.getIPAddrFromReq(req);
          resultObj.method = req.method;
          resultObj.process = req.process;
          resultObj.uri = req.url;
          resultObj.request_id = req.request_id || 'None';
          resultObj.type = o.actionType;
          resultObj.botName = o.botId;
          resultObj.roomId = o.roomId;

          u.findByIdThenName(roomModel, o.roomId, {})
            .then((r) => u.findByIdThenName(roomTypeModel, r.type, {}))
            .then((rt) => {
              resultObj.roomType = rt.name;
              activityLogUtil.printActivityLogString(resultObj, 'event');
            });
        }

        return res.status(httpStatus.CREATED)
            .json(u.responsify(o, helper, req.method));
      })
        .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * POST /events/bulk
   *
   * Upserts multiple events. Returns "OK" without waiting for the creates to
   * happen.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   * @returns {Promise} - A promise that resolves to the response object,
   * indicating merely that the bulk create request has been received.
   */
  bulkPostEvent(req, res, next) {
    const resultObj = { reqStartTime: req.timestamp };
    const value = req.swagger.params.queryBody.value;
    const body = { status: 'OK' };

    /**
     * Performs bulk upsert through the db model.
     * Works regardless of whether user is provided or not.
     *
     * @param {Object} user Sequelize result. Optional
     * @returns {Promise} a promise that resolves to the response object
     * with status and body.
     */
    function bulkPost(user) {
      if (featureToggles.isFeatureEnabled('enableWorkerProcess')) {
        const jobType = require('../../../jobQueue/setup').jobType;
        const jobWrapper = require('../../../jobQueue/jobWrapper');
        const wrappedBulkPostData = {};
        wrappedBulkPostData.createData = value;
        wrappedBulkPostData.user = user;
        wrappedBulkPostData.reqStartTime = resultObj.reqStartTime;
        const jobPromise = jobWrapper
          .createPromisifiedJob(jobType.bulkPostEvents,
            wrappedBulkPostData, req);
        return jobPromise.then((job) => {
          // Set the jobId in the response object before it is returned
          body.jobId = job.id;
          u.logAPI(req, resultObj, body, value.length);
          return res.status(httpStatus.OK).json(body);
        })
        .catch((err) => {
          u.handleError(next, err, helper.modelName);
        });
      }

      // If enableWorkerProcess is toggled off, just carry out with web dynosåååå
      helper.model.bulkCreate(value, user);
      u.logAPI(req, resultObj, body, value.length);
      return Promise.resolve(res.status(httpStatus.OK).json(body));
    } // bulkPost

    bulkPost(req.user)
      .catch((err) => u.handleError(next, err, helper.modelName));
  }, // bulkPostEvent

  /**
   * GET /events/bulk/{key}/status
   *
   * Retrieves the status of the bulk create job and sends it back in the
   * response
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getEventBulkStatus(req, res, next) {
    const resultObj = { reqStartTime: req.timestamp };
    const reqParams = req.swagger.params;
    const jobId = reqParams.key.value;
    kue.Job.get(jobId, (_err, job) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;

      /*
       * throw the "ResourceNotFoundError" if there is an error in getting the
       * job or the job is not a bulkPostEvents job
       */
      if (_err || !job || job.type !== kueSetup.jobType.bulkPostEvents) {
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
}; // exports
