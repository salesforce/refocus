/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/botData.js
 */
'use strict';

const helper = require('../helpers/nouns/botData');
const Bot = require('../../../db').Bot;
const BotData = helper.model;
const doPost = require('../helpers/verbs/doPost');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doDelete = require('../helpers/verbs/doDelete');
const doGetWriters = require('../helpers/verbs/doGetWriters');
const doPostWriters = require('../helpers/verbs/doPostWriters');
const doDeleteAllAssoc = require('../helpers/verbs/doDeleteAllBToMAssoc');
const doDeleteOneAssoc = require('../helpers/verbs/doDeleteOneBToMAssoc');
const u = require('../../../utils/common');
const v = require('../helpers/verbs/utils');
const bdUtils = require('../../../db/helpers/botDataUtils');
const Op = require('sequelize').Op;

module.exports = {

  /**
   * DELETE /botData/{key}
   *
   * Deletes the botData and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteBotData(req, res, next) {
    doDelete(req, res, next, helper);
  },

  /**
   * PATCH /botData/{key}
   *
   * Update the specified botData
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchBotData(req, res, next) {
    doPatch(req, res, next, helper);
  },

  /**
   * GET /botData/, /room/{roomID}/bot/{botID}/data, /room/{roomID}/data
   *
   * Finds zero or more botData and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findBotData(req, res, next) {
    const botId = req.swagger.params.botId;
    if (botId && !u.looksLikeId(botId.value)) {
      Bot.findOne({
        where: {
          name: { [Op.iLike]: req.swagger.params.botId.value },
        },
      })
      .then((o) => {
        if (o) {
          req.swagger.params.botId.value = o.dataValues.id;
        }

        doFind(req, res, next, helper);
      });
    } else {
      doFind(req, res, next, helper);
    }
  },

  /**
   * POST /botData
   *
   * Creates a new botData and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postBotData(req, res, next) {
    doPost(req, res, next, helper);
  },

  /**
   * POST /botData/upsert
   *
   * Check if botData exists if does not exist create a new botData and
   * sends it back in the response; if does exist then update the value
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  upsertBotData(req, res, next) {
    const queryBody = req.swagger.params.queryBody.value;
    const botId = queryBody.botId;
    if (botId && !u.looksLikeId(botId)) {
      Bot.findOne({
        where: {
          name: { [Op.iLike]: botId },
        },
      })
      .then((o) => {
        if (o) {
          queryBody.botId = o.dataValues.id;
          req.swagger.params.queryBody.value.botId = o.dataValues.id;
        }

        BotData.bdExists(queryBody)
        .then((bd) => {
          if (bd) {
            req.swagger.params.key = { value: bd.id };
            req.swagger.params.queryBody.value.value =
              bdUtils.combineValue(bd.value, queryBody.value);
            doPatch(req, res, next, helper);
          } else {
            doPost(req, res, next, helper);
          }
        })
        .catch((err) => v.handleError(next, err, helper.modelName));
      });
    } else {
      BotData.bdExists(queryBody)
      .then((bd) => {
        if (bd) {
          req.swagger.params.key = { value: bd.id };
          req.swagger.params.queryBody.value.value =
            bdUtils.combineValue(bd.value, queryBody.value);
          doPatch(req, res, next, helper);
        } else {
          doPost(req, res, next, helper);
        }
      })
      .catch((err) => v.handleError(next, err, helper.modelName));
    }
  },

  /**
   * GET /botData/{key}
   *
   * Retrieves the botData and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getBotData(req, res, next) {
    doGet(req, res, next, helper);
  },
  /**
   * GET /botData/{key}/writers
   *
   * Retrieves all the writers associated with the bot
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getBotDataWriters(req, res, next) {
    doGetWriters.getWriters(req, res, next, helper);
  }, // getSubjectWriters

  /**
   * GET /botData/{key}/writers/userNameOrId
   *
   * Determine whether a user is an authorized writer for a bot and returns
   * the user record if so.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getBotDataWriter(req, res, next) {
    doGetWriters.getWriter(req, res, next, helper);
  }, // getSubjectWriter

  /**
   * POST /botData/{key}/writers
   *
   * Add one or more users to an bots list of authorized writers
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postBotDataWriters(req, res, next) {
    doPostWriters(req, res, next, helper);
  }, // postSubjectWriters

  /**
   * DELETE /botData/{keys}/writers
   *
   * Deletes all the writers associated with this resource.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteBotDataWriters(req, res, next) {
    doDeleteAllAssoc(req, res, next, helper, helper.belongsToManyAssoc.users);
  },

  /**
   * DELETE /botData/{keys}/writers/userNameOrId
   *
   * Deletes a user from an botAction's list of authorized writers.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteBotDataWriter(req, res, next) {
    const userNameOrId = req.swagger.params.userNameOrId.value;
    doDeleteOneAssoc(req, res, next, helper,
        helper.belongsToManyAssoc.users, userNameOrId);
  },

}; // exports
