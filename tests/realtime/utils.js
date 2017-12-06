/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/realtime/utils.js
 */
'use strict'; // eslint-disable-line strict
const tu = require('../testUtils');
const path = require('path');
const fs = require('fs');
const testStartTime = new Date();
const rt = `${tu.namePrefix}TestRoomType`;
const r = `${tu.namePrefix}TestRoom`;

const standardRoom = {
  name: r,
  active: true,
  type: '23',
};

const standardRoomType = {
  name: rt,
  isEnabled: true,
  settings: {
    Key1: 'Value1',
    Key2: 'Value2',
  },
  rules: [
    {
      rule: {
        and: [
          { '>': [1, 2] },
          { '<': [3, 4] },
        ],
      },
      action: {
        name: 'Action1',
        parameters: [
          {
            name: 'Parameter1',
            value: 'Value1',
          },
          {
            name: 'Parameter2',
            value: 'Value2',
          },
          {
            name: 'Parameter3',
            value: 'Value3',
          },
        ],
      },
    },
    {
      rule: {
        or: [
          { '>': [5, 6] },
          {
            and: [
              { '>': [7, 8] },
              { '<': [9, 10] },
            ],
          },
        ],
      },
      action: {
        name: 'Action2',
        parameters: [
          {
            name: 'Parameter1',
            value: 'Value1',
          },
          {
            name: 'Parameter2',
            value: 'Value2',
          },
          {
            name: 'Parameter3',
            value: 'Value3',
          },
        ],
      },
    },
  ],
};

const standardBot = {
  name: 'TestBot',
  url: 'http://www.bar.com',
  active: true,
  settings: [
    { key: 'key1', helpText: 'help Text 1' },
  ],
  actions: [
    {
      name: 'Action1',
      parameters: [
        { name: 'Param1', type: 'BOOLEAN' },
        { name: 'Param2', type: 'INTEGER' },
        { name: 'Param3', type: 'DECIMAL' },
        { name: 'Param4', type: 'STRING' },
      ],
    },
    {
      name: 'Action2',
      parameters: [
        { name: 'Param1', type: 'BOOLEAN' },
        { name: 'Param2', type: 'INTEGER' },
        { name: 'Param3', type: 'DECIMAL' },
        { name: 'Param4', type: 'STRING' },
      ],
    },
  ],
  data: [
    { name: 'Data1', type: 'BOOLEAN' },
    { name: 'Data2', type: 'INTEGER' },
    { name: 'Data3', type: 'DECIMAL' },
    { name: 'Data4', type: 'STRING' },
    { name: 'Data5', type: 'ARRAY' },
  ],
};

const standardBotAction = {
  isPending: true,
  name: 'Action1',
  parameters: [
    {
      name: 'Param1',
      value: true,
    },
    {
      name: 'Param2',
      value: 4,
    },
    {
      name: 'Param3',
      value: 62.2,
    },
    {
      name: 'Param4',
      value: 'TestValue',
    },
  ],
};

module.exports = {
  doSetup() {
    return new tu.db.Sequelize.Promise((resolve, reject) => {
      const willSendthis = fs.readFileSync(
        path.join(__dirname,
        'lens.zip')
      );
      const lens = {
        name: `${tu.namePrefix}testLensName`,
        sourceName: 'testSourceLensName',
        description: 'test Description',
        sourceDescription: 'test Source Description',
        isPublished: true,
        library: willSendthis,
      };
      tu.db.Lens.create(lens)
      .then((createdLens) => resolve(createdLens))
      .catch((err) => reject(err));
    });
  },

  getStandardRoomType() {
    return JSON.parse(JSON.stringify(standardRoomType));
  },

  getStandardRoom() {
    return JSON.parse(JSON.stringify(standardRoom));
  },

  getStandardBot() {
    return JSON.parse(JSON.stringify(standardBot));
  },

  getStandardBotAction() {
    return JSON.parse(JSON.stringify(standardBotAction));
  },

  forceDelete(done) {
    tu.forceDelete(tu.db.Perspective, testStartTime)
    .then(() => tu.forceDelete(tu.db.Lens, testStartTime))
    .then(() => tu.forceDelete(tu.db.Sample, testStartTime))
    .then(() => tu.forceDelete(tu.db.Subject, testStartTime))
    .then(() => tu.forceDelete(tu.db.Aspect, testStartTime))
    .then(() => tu.forceDelete(tu.db.BotAction, testStartTime))
    .then(() => tu.forceDelete(tu.db.Bot, testStartTime))
    .then(() => tu.forceDelete(tu.db.RoomType, testStartTime))
    .then(() => done())
    .catch(done);
  },
};
