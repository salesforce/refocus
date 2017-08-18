/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/api/roomType/utils.js
 */
'use strict';
const tu = require('../../../testUtils');

const testStartTime = new Date();
const n = `${tu.namePrefix}TestRoomType`;
const n2 = n + 'NonActive';

const standard = {
  name: n,
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

const nonActive = {
  name: n2,
  isEnabled: false,
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

module.exports = {
  name: n,

  nameNonActive: n2,

  getStandard() {
    return JSON.parse(JSON.stringify(standard));
  },

  createNonActive() {
    return tu.db.RoomType.create(nonActive);
  },

  createStandard() {
    return tu.db.RoomType.create(standard);
  },

  forceDelete(done) {
    tu.forceDelete(tu.db.RoomType, testStartTime)
    .then(() => done())
    .catch(done);
  },
};
