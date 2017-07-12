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
const b = require('../../../db/model/bot/utils');
const r = require('../../../db/model/room/utils');

const testStartTime = new Date();
const logLine = 'Sample Event';
const logLine2 = 'Sample Event 2';
const logLine3 = 'Sample Event 3';

const bot = b.createStandard();
const room = r.createStandard();

const standard = {
  log: logLine,
  context: {
    Sample: 'DATA',
  },
  botId: bot.id,
  roomId: room.id,
};

const standard3 = {
  log: logLine3,
  context: {
    Sample: 'DATA',
  },
  botId: bot.id,
};

const standard2 = {
  log: logLine2,
  context: {
    Sample: 'DATA',
  },
  roomId: room.id,
};

module.exports = {
  log: logLine,

  log2: logLine2,

  log3: logLine3,

  getStandard() {
    return JSON.parse(JSON.stringify(standard));
  },

  createStandard() {
    return tu.db.Event.create(standard);
  },

  createStandard2() {
    return tu.db.Event.create(standard2);
  },

  createStandard3() {
    return tu.db.Event.create(standard3);
  },

  forceDelete(done) {
    tu.db.Event.destroy({
      where: {
        createdAt: {
          $lt: new Date(),
          $gte: testStartTime,
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
