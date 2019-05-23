/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/api/botActions/utils.js
 */
'use strict';
const tu = require('../../../testUtils');
const roomUtil = require('../rooms/utils');
const botUtil = require('../bots/utils');

const testStartTime = new Date();
const Action1 = 'Action1';

const standard = {
  isPending: true,
  name: Action1,
  parameters: [
    { name: 'Param1', value: true },
    { name: 'Param2', value: 4 },
    { name: 'Param3', value: 62.2 },
    { name: 'Param4', value: 'TestValue' },
  ],
};

const res = {
  isPending: true,
  name: 'Action2',
  parameters: [
    { name: 'Param1', value: true },
    { name: 'Param2', value: 4 },
    { name: 'Param3', value: 62.2 },
    { name: 'Param4', value: 'TestValue' },
  ],
  response: {
    message: 'Action Completed',
  },
};

module.exports = {
  name: Action1,

  getStandard() {
    return JSON.parse(JSON.stringify(standard));
  },

  getResponse() {
    return JSON.parse(JSON.stringify(res));
  },

  createStandard() {
    return tu.db.BotData.create(standard);
  },

  createResponse() {
    return tu.db.BotData.create(res);
  },

  getBasic(overrideProps={}) {
    if (!overrideProps.name) {
      delete overrideProps.name;
    }

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
    const { userId, name } = overrideProps;

    if (overrideProps.botId && overrideProps.roomId) {
      const toCreate = this.getBasic(overrideProps);
      return tu.db.BotAction.create(toCreate);
    }

    return this.doSetup({ userId, name })
    .then(({ botId, roomId }) => {
      Object.assign(overrideProps, { botId, roomId });
      const toCreate = this.getBasic(overrideProps);
      return tu.db.BotAction.create(toCreate);
    });
  },

  createBasicWithActionName(overrideProps={}) {
    const { name, userId } = overrideProps;

    if (overrideProps.botId && overrideProps.roomId) {
      return tu.db.Bot.findByPk(overrideProps.botId)
        .then((bot) => {
          const botActions = bot.actions;
          botActions.push({ name, parameters: standard.parameters });
          return bot.update({ actions: botActions });
        })
      .then(() => {
        const toCreate = this.getBasic(overrideProps);
        return tu.db.BotAction.create(toCreate);
      });
    }

    const botObj = {
      installedBy: userId,
      actions: [{ name, parameters: standard.parameters }],
    };
    return Promise.all([
      botUtil.createBasic(botObj),
      roomUtil.createBasic(),
    ])
      .then(([bot, room]) => {
        const createdIds = {
          botId: bot.id,
          roomId: room.id,
        };
        return createdIds;
      })
      .then(({ botId, roomId }) => {
        Object.assign(overrideProps, { botId, roomId });
        const toCreate = this.getBasic(overrideProps);
        return tu.db.BotAction.create(toCreate);
      });
  },

  getDependencyProps() {
    return ['botId', 'roomId'];
  },

  forceDelete(done, startTime=testStartTime) {
    tu.forceDelete(tu.db.BotAction, startTime)
    .then(() => tu.forceDelete(tu.db.Bot, startTime))
    .then(() => tu.forceDelete(tu.db.Room, startTime))
    .then(() => tu.forceDelete(tu.db.RoomType, startTime))
    .then(() => done())
    .catch(done);
  },
};
