/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * api/v1/controllers/rooms.js
 */
'use strict';

const helper = require('../helpers/nouns/rooms');
const RoomType = require('../../../db').RoomType;
const doDelete = require('../helpers/verbs/doDelete');
const doFind = require('../helpers/verbs/doFind');
const doGet = require('../helpers/verbs/doGet');
const doPatch = require('../helpers/verbs/doPatch');
const doPost = require('../helpers/verbs/doPost');
const doPut = require('../helpers/verbs/doPut');
const doGetWriters = require('../helpers/verbs/doGetWriters');
const doPostWriters = require('../helpers/verbs/doPostWriters');
const doDeleteAllAssoc = require('../helpers/verbs/doDeleteAllBToMAssoc');
const doDeleteOneAssoc = require('../helpers/verbs/doDeleteOneBToMAssoc');
const u = require('../../../utils/common');
const Op = require('sequelize').Op;

module.exports = {

  /**
   * DELETE /rooms/{key}
   *
   * Deletes the room and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteRooms(req, res, next) {
    doDelete(req, res, next, helper);
  },

  /**
   * GET /rooms
   *
   * Finds zero or more rooms and sends them back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  findRooms(req, res, next) {
    const type = req.swagger.params.type;
    if (type && !u.looksLikeId(type.value)) {
      RoomType.findOne({
        where: {
          name: { [Op.iLike]: req.swagger.params.type.value },
        },
      })
      .then((o) => {
        if (o) {
          req.swagger.params.type.value = o.dataValues.id;
        }

        console.log(req.swagger.params.type)
        doFind(req, res, next, helper);
      });
    } else {
      doFind(req, res, next, helper);
    }
  },

  /**
   * GET /rooms/{key}
   *
   * Retrieves the room and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getRoom(req, res, next) {
    doGet(req, res, next, helper);
  },

  /**
   * PATCH /rooms/{key}
   *
   * Update the specified room
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  patchRoom(req, res, next) {
    doPatch(req, res, next, helper);
  },

  /**
   * POST /rooms
   *
   * Creates a new room and sends it back in the response.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postRooms(req, res, next) {
    doPost(req, res, next, helper);
  },

  /**
   * GET /rooms/{key}/writers
   *
   * Retrieves all the writers associated with the room
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getRoomWriters(req, res, next) {
    doGetWriters.getWriters(req, res, next, helper);
  }, // getRoomWriters

  /**
   * GET /rooms/{key}/writers/userNameOrId
   *
   * Determine whether a user is an authorized writer for a room and returns
   * the user record if so.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  getRoomWriter(req, res, next) {
    doGetWriters.getWriter(req, res, next, helper);
  }, // getRoomWriter

  /**
   * POST /rooms/{key}/writers
   *
   * Add one or more users to an rooms list of authorized writers
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  postRoomWriters(req, res, next) {
    doPostWriters(req, res, next, helper);
  }, // postRoomWriters

  /**
   * DELETE /rooms/{keys}/writers
   *
   * Deletes all the writers associated with this resource.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteRoomWriters(req, res, next) {
    doDeleteAllAssoc(req, res, next, helper, helper.belongsToManyAssoc.users);
  }, // deleteRoomWriters

  /**
   * DELETE /rooms/{keys}/writers/userNameOrId
   *
   * Deletes a user from an room's list of authorized writers.
   *
   * @param {IncomingMessage} req - The request object
   * @param {ServerResponse} res - The response object
   * @param {Function} next - The next middleware function in the stack
   */
  deleteRoomWriter(req, res, next) {
    const userNameOrId = req.swagger.params.userNameOrId.value;
    doDeleteOneAssoc(req, res, next, helper,
        helper.belongsToManyAssoc.users, userNameOrId);
  }, // deleteRoomWriter

}; // exports
