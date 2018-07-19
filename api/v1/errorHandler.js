/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/errorHandler.js
 *
 * API Error Handler
 */
'use strict';

const util = require('util');
const nodeEnv = require('../../config').nodeEnv;
const featureToggles = require('feature-toggles');
const apiErrors = require('./apiErrors');
const constants = require('./constants');
const dbErrors = require('../../db/dbErrors');
const cacheErrors = require('../../cache/redisErrors');
const activityLog = require('../../utils/activityLog');

function stackTraceFilter(ln) {
  return !ln.includes('/node_modules/') &&
  !ln.includes('timers.js') &&
  !ln.includes('next_tick') &&
  !ln.includes('module.js');
} // stackTraceFilter

/**
 * Display additional details from the request, response and error using
 * console.error. Filters a bunch of node_modules and core node.js lines from
 * the stack trace so we can focus on *our* code.
 *
 * @param {Object} req - the request
 * @param {Object} errResponse - the error response
 * @param {Error} - the error
 * @param {Function} outputFn - the output function, defaults to console.error
 */
function displayErrorDetails(req, errResponse, err, outputFn = console.error) {
  outputFn('\n------------\nerrorHandler\n------------');
  outputFn(req.method, req.url, req.body);
  outputFn(errResponse);
  outputFn(`Status ${err.status}: ${err.message}`);
  err.stack.split('\n').slice(1) // ignore the first line of the stack trace
    .filter(stackTraceFilter)
    .forEach((ln) => outputFn(ln));
  outputFn('');
} // displayErrorDetails

/**
 * Indicates whether the error is an API error as defined by our apiErrors
 * module.
 *
 * @param {Error} err - The error to test
 * @returns {Boolean} true if err is defined as one of our API errors
 */
function isApiError(err) {
  return err instanceof apiErrors.ResourceNotFoundError ||
  err instanceof apiErrors.ValidationError ||
  err instanceof apiErrors.RefocusApiError;
}

/**
 * Indicates whether the error is a DB error as defined by our dbErrors
 * module.
 *
 * @param {Error} err - The error to test
 * @returns {Boolean} true if err is defined as one of our DB errors
 */
function isDbError(err) {
  // TODO figure out a way to avoid having to enumerate them all here!!!
  return err instanceof dbErrors.FocusDatabaseError ||
  err instanceof dbErrors.ValidationError ||
  err instanceof dbErrors.MissingRequiredFieldError ||
  err instanceof dbErrors.InvalidProfileReassignmentError ||
  err instanceof dbErrors.InvalidRangeValuesError ||
  err instanceof dbErrors.InvalidRangeSizeError ||
  err instanceof dbErrors.DeleteConstraintError ||
  err instanceof dbErrors.ProfileDeleteConstraintError ||
  err instanceof dbErrors.SubjectDeleteConstraintError ||
  err instanceof dbErrors.ResourceNotFoundError ||
  err instanceof dbErrors.CreateConstraintError;
}

/**
 * Indicates whether the error is a Cache error as defined by our cacheErrors
 * module.
 *
 * @param {Error} err - The error to test
 * @returns {Boolean} true if err is defined as one of our Cache errors
 */
function isCacheError(err) {
  return err instanceof cacheErrors.RefocusRedisError;
}

/**
 * Construct error response based on various errors
 *
 * @param {Error} err - The error
 * @returns {Object} return newly constructed error object based on error
 */
function constructError(err) {
  const error = {
    errors: [],
  };

  if ('errors' in err) {
    // construct API error object
    for (const e in err.errors) {
      const temp = {};
      temp.message = err.errors[e].message || '';
      temp.source = err.errors[e].path || '';
      temp.value = err.errors[e].value || '';
      temp.type = err.name || '';
      error.errors.push(temp);
    }
  } else if ('results' in err) {
    // construct DB error object
    for (const e in err.results.errors) {
      const temp = {};
      temp.message = err.results.errors[e].message || '';
      temp.source = err.results.errors[e].path[0] || '';
      temp.value = err.results.errors[e].value || '';
      temp.type = err.code || '';
      temp.description = err.results.errors[e].description || '';
      error.errors.push(temp);
    }
  } else {
    // construct any other custom error object
    const temp = {};
    temp.message = err.message || '';
    temp.source = err.resource || '';
    temp.value = err.key || '';
    temp.type = err.name || '';
    temp.description = err.explanation || '';
    error.errors.push(temp);
  }

  return error;
}

module.exports = function errorHandler(err, req, res, next) {
  /* If no error is defined, pass to next middleware. */
  if (!util.isError(err)) return next();

  let errResponse;
  try {
    errResponse = constructError(err);
    if (!isApiError(err) && !isDbError(err) && !isCacheError(err)) {
      if (/Route defined in Swagger specification.*/.test(err.message)) {
        err.status = constants.httpStatus.NOT_ALLOWED;
      } else if (err.name === 'Unauthorized') {
        // Log and reject
        err.status = constants.httpStatus.UNAUTHORIZED;

        if (featureToggles.isFeatureEnabled('enableUnauthorizedActivityLogs')) {
          const logObject = {
            activity: 'unauthorized',
            ipAddress: activityLog.getIPAddrFromReq(req),
            uri: req.url,
            method: req.method,
          };

          // Add "request_id" if header is set by heroku.
          if (req.request_id) logObject.request_id = req.request_id;
          activityLog.printActivityLogString(logObject, 'unauthorized');
        }
      } else {
        err.status = constants.httpStatus.BAD_REQUEST;
      }
    }

    if (nodeEnv === 'development') displayErrorDetails(req, errResponse, err);
    res.status(err.status).json(errResponse);
  } catch (err2) {
    if (nodeEnv === 'development') displayErrorDetails(req, errResponse, err);
    return next;
  }
};
