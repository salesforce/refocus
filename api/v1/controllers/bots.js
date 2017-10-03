/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/bots.js
 */
'use strict';

const u = require('../helpers/verbs/utils');
const httpStatus = require('../constants').httpStatus;
const jwtUtil = require('../../../utils/jwtUtil');
const helper = require('../helpers/nouns/bots');
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');

module.exports = {

  /**
   * DELETE /bots/{key}
   *
   * Deletes the bot and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteBots(req, res, next) {
    doDelete(req, res, next, helper);
  },

  /**
   * GET /bots
   *
   * Finds zero or more bots and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findBots(req, res, next) {
    doFind(req, res, next, helper);
  },

  /**
   * GET /bots/{key}
   *
   * Retrieves the bot and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getBot(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * PATCH /bots/{key}
   *
   * Update the specified bot
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchBot(req, res, next) {
    doPatch(req, res, next, helper);
  },

  /**
   * POST /bots
   *
   * Creates a new bot and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postBots(req, res, next) {
    const resultObj = { reqStartTime: req.timestamp };
    const reqObj = req.swagger.params;
    const seqObj = {};
    const uiObj = {};
    try {
      for (const param in reqObj) {
        if (reqObj[param].value) {
          if (typeof (reqObj[param].value) === 'object' &&
            param === 'ui') {
            seqObj[param] = reqObj[param].value.buffer;
            uiObj.name = reqObj[param].value.originalname;
            uiObj.size = reqObj[param].value.size;
          } else {
            seqObj[param] = reqObj[param].value;
          }
        }
      }

      helper.model.create(seqObj)
        .then((o) => {
          o.dataValues.ui = uiObj;
          if (helper.loggingEnabled) {
            resultObj.dbTime = new Date() - resultObj.reqStartTime;
            u.logAPI(req, resultObj, o.dataValues);
          }

          o.dataValues.token = jwtUtil
            .createToken(seqObj.name, seqObj.name);
          return res.status(httpStatus.CREATED)
            .json(u.responsify(o, helper, req.method));
        })
        .catch((err) => {
          u.handleError(next, err, helper.modelName);
        });
    } catch (err) {
      err.description = 'Invalid UI uploaded.';
      u.handleError(next, err, helper.modelName);
    }
  },

  /**
   * PUT /bots/{key}
   *
   * Overrides the bot with that ID
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  putBots(req, res, next) {
    const resultObj = { reqStartTime: req.timestamp };
    const reqObj = req.swagger.params;
    const uiObj = {};
    u.findByKey(helper, req.swagger.params)
    .then((o) => {
      for (const param in reqObj) {
        if (reqObj[param].value) {
          if (param === 'ui') {
            o.set(param, reqObj[param].value.buffer);
            uiObj.name = reqObj[param].value.originalname;
            uiObj.size = reqObj[param].value.size;
          } else {
            o.set(param, reqObj[param].value);
          }
        }
      }

      return o.save();
    })
    .then((o) => {
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      o.dataValues.ui = uiObj;
      u.logAPI(req, resultObj, o.dataValues);
      res.status(httpStatus.CREATED).json(
        u.responsify(o, helper, req.method)
      );
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

}; // exports
