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
const apiErrors = require('./apiErrors');
const constants = require('./constants');
const dbErrors = require('../../db/dbErrors');

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
  if (!util.isError(err)) { // If no error is defined, pass to next middleware
    return next();
  }

  try {
    const errResponse = constructError(err);
    if (!isApiError(err) && !isDbError(err)) {
      if (/Route defined in Swagger specification.*/.test(err.message)) {
        err.status = constants.httpStatus.NOT_ALLOWED;
      } else if (err.name === 'SequelizeUniqueConstraintError') {
        err.status = constants.httpStatus.FORBIDDEN;
      } else {
        err.status = constants.httpStatus.BAD_REQUEST;
      }
    }

    // console.log('\n-----ERROR HANDLER------------------------------------');
    // console.log('ERROR STATUS: ', err.status);
    // console.log('ERROR RESPONSE: ', errResponse);
    // console.log('REQUEST BODY: ', req.body);
    // console.log('STACK: ', err.stack);
    // console.log('------------------------------------------------------\n');
    res.status(err.status).json(errResponse);
  } catch (err2) {
    // console.log('\n-----ERROR HANDLER CATCH------------------------------');
    // console.log(err2);
    // console.log('STACK: ', util.isError(err2) && err2.stack);
    // console.log('------------------------------------------------------\n');
    return next;
  }
};
