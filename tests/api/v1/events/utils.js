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
const roomUtil = require('../rooms/utils');
const botUtil = require('../bots/utils');
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

  getBasic(overrideProps={}) {
    const defaultProps = JSON.parse(JSON.stringify(standard));
    return Object.assign(defaultProps, overrideProps);
  },

  doSetup(props={}) {
    const { userId } = props;
    return Promise.all([
      botUtil.createBasic({ installedBy: userId }),
      roomUtil.createBasic({ createdBy: userId }),
    ])
    .then(([bot, room]) => {
      const createdIds = {
        botId: bot.id,
        roomId: room.id,
      };
      return createdIds;
    });
  },

  createBasic(overrideProps={}) {
    const { userId } = overrideProps;
    return this.doSetup({ userId })
    .then(({ botId, roomId }) => {
      Object.assign(overrideProps, { botId, roomId });
      const toCreate = this.getBasic(overrideProps);
      return tu.db.Event.create(toCreate);
    });
  },

  getDependencyProps() {
    return ['botId', 'roomId'];
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
