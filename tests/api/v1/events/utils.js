/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/api/bot/utils.js
 */
'use strict';
const tu = require('../../../testUtils');
const Op = require('sequelize').Op;

const testStartTime = new Date();
const logLine = 'Sample Event';

const standard = {
  log: logLine,
  actionType: 'EventType',
  context: {
    Sample: 'DATA',
  },
};

module.exports = {
  log: logLine,

  getStandard() {
    return JSON.parse(JSON.stringify(standard));
  },

  createStandard() {
    return tu.db.Event.create(standard);
  },

  forceDelete(done) {
    tu.db.Event.destroy({
      where: {
        createdAt: {
          [Op.lt]: new Date(),
          [Op.gte]: testStartTime,
        },
      },
      force: true,
    })
    .then(() => tu.forceDelete(tu.db.BotData, testStartTime))
    .then(() => tu.forceDelete(tu.db.BotAction, testStartTime))
    .then(() => tu.forceDelete(tu.db.Bot, testStartTime))
    .then(() => tu.forceDelete(tu.db.Room, testStartTime))
    .then(() => tu.forceDelete(tu.db.RoomType, testStartTime))
    .then(() => done())
    .catch(done);
  },
};
