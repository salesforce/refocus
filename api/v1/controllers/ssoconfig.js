/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/ssoconfig.js
 */
'use strict'; // eslint-disable-line strict

const helper = require('../helpers/nouns/ssoconfig');
const httpStatus = require('../constants').httpStatus;
const u = require('../helpers/verbs/utils');
const apiErrors = require('../apiErrors');

/**
 * Builds the API links to send back in the response.
 *
 * @param {String} key - The record id or name (or subject.absolutePath)
 * @param {Object} props - The helpers/nouns module for the given DB model
 * @param {String} method - The method name
 * @returns {Object} the API links to send back in the response
 */
function getApiLinks(key, props, method) {
  // If this was a DELETE method, only include a POST link...
  if (/delete/i.test(method)) {
    return [
      {
        href: props.baseUrl,
        method: 'POST',
        rel: props.apiLinks.POST,
      },
    ];
  }

  // Otherwise include all the methods specified for this resource
  return Object.keys(props.apiLinks).map((i) => ({
    href: props.baseUrl,
    method: i,
    rel: props.apiLinks[i],
  }));
} // getApiLinks

/**
 * Prepares the object to be sent back in the response ("cleans" the object,
 * strips out nulls, adds API links).
 *
 * @param {Instance|Array} rec - The record or records to return in the
 *  response
 * @param {Object} props - The helpers/nouns module for the given DB model
 * @param {String} method - The request method, used to help build the API
 *  links
 * @returns {Object} the "responsified" cleaned up object to send back in
 *  the response
 */
function responsify(rec, props, method) {
  const o = u.cleanAndStripNulls(rec);
  o.apiLinks = getApiLinks(o.id, props, method);
  return o;
} // responsify

module.exports = {

  /**
   * DELETE /ssoconfig
   *
   * Deletes the ssoconfig and sends it back in the response. Reject if user
   * does not have an admin profile.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteSSOConfig(req, res, next) {
    const resultObj = { reqStartTime: req.timestamp };
    if (!req.headers.IsAdmin) {
      return u.forbidden(next);
    }

    return helper.model.findOne()
    .then((o) => {
      if (o) {
        o.destroy()
        .then((destroyedObj) => {
          resultObj.dbTime = new Date() - resultObj.reqStartTime;
          u.logAPI(req, resultObj, destroyedObj);
          res.status(httpStatus.OK)
          .json(responsify(destroyedObj, helper, req.method));
        });
      } else {
        const err = new apiErrors.ResourceNotFoundError();
        err.info = 'There is no sso config to delete.';
        u.handleError(next, err, helper.modelName);
      }
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * GET /ssoconfig
   *
   * Retrieves the ssoconfig and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getSSOConfig(req, res, next) {
    const resultObj = { reqStartTime: req.timestamp };
    helper.model.findOne()
    .then((o) => {
      if (o) {
        resultObj.dbTime = new Date() - resultObj.reqStartTime;
        u.logAPI(req, resultObj, o.dataValues);
        res.status(httpStatus.OK).json(responsify(o, helper, req.method));
      } else {
        const err = new apiErrors.ResourceNotFoundError({
          explanation: 'There is no sso config.',
        });
        u.handleError(next, err, helper.modelName);
      }
    })
    .catch((err) => {
      u.handleError(next, err, helper.modelName);
    });
  },

  /**
   * PATCH /ssoconfig
   *
   * Updates the ssoconfig and sends it back in the response. PATCH will only
   * update the attributes of the user provided in the body of the request.
   * Other attributes will not be updated. Reject if user does not have an
   * admin profile.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchSSOConfig(req, res, next) {
    const resultObj = { reqStartTime: req.timestamp };
    if (!req.headers.IsAdmin) {
      return u.forbidden(next);
    }

    return helper.model.findOne()
    .then((o) => {
      if (o) {
        const requestBody = req.swagger.params.queryBody.value;

        /*
         * If patching with value, force db to update value, regardless
         * of whether it changed
         */
        if (Object.keys(requestBody).indexOf('value') >= 0) {
          o.changed('value', true);
        }

        o.update(requestBody)
        .then((updatedObj) => {
          resultObj.dbTime = new Date() - resultObj.reqStartTime;
          u.logAPI(req, resultObj, o.dataValues);
          res.status(httpStatus.OK)
          .json(responsify(updatedObj, helper, req.method));
        });
      } else {
        const err = new apiErrors.ResourceNotFoundError({
          explanation: 'There is no sso config.',
        });
        u.handleError(next, err, helper.modelName);
      }
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * POST /ssoconfig
   *
   * Creates a new ssoconfig and sends it back in the response. Reject if user
   * does not have an admin profile.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postSSOConfig(req, res, next) {
    const resultObj = { reqStartTime: req.timestamp };
    if (!req.headers.IsAdmin) {
      return u.forbidden(next);
    }

    const toPost = req.swagger.params.queryBody.value;
    const assocToCreate = u.includeAssocToCreate(toPost, helper);
    return helper.model.create(toPost, assocToCreate)
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      u.logAPI(req, resultObj, o.dataValues);
      res.status(httpStatus.CREATED).json(responsify(o, helper, req.method));
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  /**
   * PUT /ssoconfig
   *
   * Updates ssoconfig and sends it back in the response. If any attributes are
   * missing from the body of the request, those attributes are cleared. Reject
   * if user does not have an admin profile.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  putSSOConfig(req, res, next) {
    const resultObj = { reqStartTime: req.timestamp };
    if (!req.headers.IsAdmin) {
      return u.forbidden(next);
    }

    const toPut = req.swagger.params.queryBody.value;
    const puttableFields =
      req.swagger.params.queryBody.schema.schema.properties;
    return helper.model.findOne()
    .then((o) => {
      if (o) {
        const keys = Object.keys(puttableFields);
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          if (toPut[key] === undefined) {
            let nullish = null;
            if (puttableFields[key].type === 'boolean') {
              nullish = false;
            } else if (puttableFields[key].enum) {
              nullish = puttableFields[key].default;
            }

            o.set(key, nullish);
          } else {
            o.set(key, toPut[key]);
          }
        }

        o.save()
        .then((savedObj) => {
          resultObj.dbTime = new Date() - resultObj.reqStartTime;
          u.logAPI(req, resultObj, savedObj);
          res.status(httpStatus.OK)
          .json(responsify(savedObj, helper, req.method));
        });
      } else {
        const err = new apiErrors.ResourceNotFoundError({
          explanation: 'There is no sso config.',
        });
        u.handleError(next, err, helper.modelName);
      }
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },
}; // exports
