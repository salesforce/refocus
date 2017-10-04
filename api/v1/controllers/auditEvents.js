/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/auditEvents.js
 */
'use strict'; // eslint-disable-line strict

const featureToggles = require('feature-toggles');
const helper = require('../helpers/nouns/auditEvents');
const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
module.exports = {
  /**
   * GET /auditEvents
   *
   * Finds zero or more auditEvents and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findAuditEvents(req, res, next) {
    doFind(req, res, next, helper);
  },

  /**
   * GET /auditEvents/{key}
   *
   * Retrieves the auditEvent and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getAuditEvent(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * POST /auditevents
   *
   * Creates a new room and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   * @returns {Promise} - which resolves to the server response
   */
  postAuditEvents(req, res, next) {
    const resultObj = { reqStartTime: req.timestamp };
    const reqStartTime = Date.now();
    const auditEvents = req.swagger.params.queryBody.value;
    const body = { status: 'OK' };
    if (featureToggles.isFeatureEnabled('enableWorkerProcess')) {
      const jobType = require('../../../jobQueue/setup').jobType;
      const jobWrapper = require('../../../jobQueue/jobWrapper');

      const payload = {};
      payload.auditEvents = auditEvents;
      payload.reqStartTime = reqStartTime;

      const jobPromise = jobWrapper
        .createPromisifiedJob(jobType.BULK_CREATE_AUDIT_EVENTS,
          payload, req);
      return jobPromise.then((job) => {
        // set the job id in the response object before it is returned
        body.jobId = job.id;
        u.logAPI(req, resultObj, body, auditEvents.length);
        return res.status(httpStatus.OK).json(body);
      })
      .catch((err) => u.handleError(next, err, helper.modelName));
    }

    helper.model.bulkCreate(auditEvents);
    u.logAPI(req, resultObj, body, auditEvents.length);
    return Promise.resolve(res.status(httpStatus.OK).json(body));
  },

}; // exports
