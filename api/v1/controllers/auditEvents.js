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
const constants = require('../constants');
const httpStatus = constants.httpStatus;
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const apiErrors = require('../apiErrors');

/**
 * Validate the query parameters in the request
 * @param  {Object} params  - The request params
 */
function validateQueryParams(params) {
  /*
   * Only one of relativeDateTime filter or startAt/endAt filter combinations
   * can be present
   */
  const exclusivityCheckOnDateFilters = params.relativeDateTime.value &&
    (params.startAt.value || params.endAt.value);

  if (exclusivityCheckOnDateFilters) {
    throw new apiErrors.ValidationError({
      explanation: 'Only one of relativeDateTime or startAt/endAt ' +
        'combination can be specified',
    });
  }

  if (params.startAt.value && params.endAt.value &&
    params.startAt.value >= params.endAt.value) {
    throw new apiErrors.ValidationError({
      explanation: `The startAt date: ${params.startAt.value} should be ` +
      `less than the endAt date: ${params.endAt.value}`,
    });
  }

  if (params.relativeDateTime.value) {
    const relativeDateTime = params.relativeDateTime.value;
    const lastChar = relativeDateTime[relativeDateTime.length - 1];
    const firstChar = relativeDateTime[0];
    if (firstChar !== constants.FILTER_NEGATION ||
      !helper.timeUnits.has(lastChar)) {
      throw new apiErrors.ValidationError({
        explanation: 'RelativeDateTime should start with a negation (-) and ' +
        'end with a valid time unit. The valid time units ' +
        `are ${[...helper.timeUnits]}`,
      });
    }
  }
} // validateQueryParams

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
    validateQueryParams(req.swagger.params);
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
