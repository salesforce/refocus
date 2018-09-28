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
const doPatch = require('../helpers/verbs/doPatch');
const doGetWriters = require('../helpers/verbs/doGetWriters');
const doPostWriters = require('../helpers/verbs/doPostWriters');
const doDeleteAllAssoc = require('../helpers/verbs/doDeleteAllBToMAssoc');
const doDeleteOneAssoc = require('../helpers/verbs/doDeleteOneBToMAssoc');
const redisCache = require('../../../cache/redisCache').client.cache;
const logger = require('winston');

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
    const resultObj = { reqStartTime: req.timestamp };
    const url = req.url;

    // try to get cached entry
    redisCache.get(url, (cacheErr, reply) => {
      if (reply) {
        // reply is responsified bot object as string.
        const botObject = JSON.parse(reply);

        // add api links to the object and return response.
        botObject.apiLinks = u.getApiLinks(
          botObject.id, helper, req.method
        );
        return res.status(httpStatus.OK).json(botObject);
      }

      // if cache error, print error and continue to get bot from db.
      if (cacheErr) {
        logger.error('Cache error ', cacheErr);
      }

      // no reply, let's get bot from db
      u.findByKey(helper, req.swagger.params, ['botUI'])
      .then((o) => {
        resultObj.dbTime = new Date() - resultObj.reqStartTime;
        return o;
      })
      .then((responseObj) => {
        // cache the bot by id and name.
        redisCache.set(url, JSON.stringify(responseObj));

        u.logAPI(req, resultObj, responseObj);
        return res.status(httpStatus.OK).json(responseObj);
      })
      .catch((err) => u.handleError(next, err, helper.modelName));
    });
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
          if (typeof (reqObj[param].value) === 'object' && param === 'ui') {
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
          o.dataValues.token = jwtUtil.createToken(seqObj.name, seqObj.name,{ IsBot: true });
          resultObj.dbTime = new Date() - resultObj.reqStartTime;
          u.logAPI(req, resultObj, o.dataValues);
          return res.status(httpStatus.CREATED)
            .json(u.responsify(o, helper, req.method));
        })
        .catch((err) => u.handleError(next, err, helper.modelName));
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
    const seqObj = {};
    const uiObj = {};
    u.findByKey(helper, req.swagger.params)
    .then((o) => u.isWritable(req, o))
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
      o.dataValues.ui = uiObj;
      o.dataValues.token = jwtUtil.createToken(o.dataValues.name, o.dataValues.name,{ IsBot: true });
      resultObj.dbTime = new Date() - resultObj.reqStartTime;
      u.logAPI(req, resultObj, o.dataValues);
      res.status(httpStatus.CREATED).json(u.responsify(o, helper, req.method));
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  },

  heartbeat(req, res, next) {
    const timestamp = req.body.currentTimestamp;

    u.findByKey(helper, req.swagger.params)
    .then((o) => {
      o.set('lastHeartbeat', timestamp);
      res.status(httpStatus.OK).json();
      return o.save();
    })
    .catch((err) => u.handleError(next, err, helper.modelName));
  }, // heartbeat

  /**
   * GET /bots/{key}/writers
   *
   * Retrieves all the writers associated with the bot
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getBotWriters(req, res, next) {
    doGetWriters.getWriters(req, res, next, helper);
  }, // getBotWriters

  /**
   * GET /bots/{key}/writers/userNameOrId
   *
   * Determine whether a user is an authorized writer for a bot and returns
   * the user record if so.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getBotWriter(req, res, next) {
    doGetWriters.getWriter(req, res, next, helper);
  }, // getBotWriter

  /**
   * POST /bots/{key}/writers
   *
   * Add one or more users to an bots list of authorized writers
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postBotWriters(req, res, next) {
    doPostWriters(req, res, next, helper);
  }, // postBotWriters

  /**
   * DELETE /bots/{keys}/writers
   *
   * Deletes all the writers associated with this resource.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteBotWriters(req, res, next) {
    doDeleteAllAssoc(req, res, next, helper, helper.belongsToManyAssoc.users);
  }, // deleteBotWriters

  /**
   * DELETE /bots/{keys}/writers/userNameOrId
   *
   * Deletes a user from an bot's list of authorized writers.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteBotWriter(req, res, next) {
    const userNameOrId = req.swagger.params.userNameOrId.value;
    doDeleteOneAssoc(req, res, next, helper,
        helper.belongsToManyAssoc.users, userNameOrId);
  }, // deleteBotWriter

}; // exports
