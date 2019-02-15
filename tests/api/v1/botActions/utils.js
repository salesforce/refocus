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
      return tu.db.BotAction.create(toCreate);
    });
  },

  getDependencyProps() {
    return ['botId', 'roomId'];
  },

  forceDelete(done) {
    tu.forceDelete(tu.db.BotAction, testStartTime)
    .then(() => tu.forceDelete(tu.db.Bot, testStartTime))
    .then(() => tu.forceDelete(tu.db.Room, testStartTime))
    .then(() => tu.forceDelete(tu.db.RoomType, testStartTime))
    .then(() => done())
    .catch(done);
  },
};
