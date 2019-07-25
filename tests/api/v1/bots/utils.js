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
const path = require('path');
const fs = require('fs');
const tu = require('../../../testUtils');

const testStartTime = new Date();
const n = `${tu.namePrefix}TestBot`;
const displayName = `${tu.namePrefix}Test Bot`;
const n2 = n + 'NonActive';
const mt = path.join(__dirname, './uiBlob');
const uiBlob = fs.readFileSync(mt);

const standard = {
  name: n,
  displayName,
  url: 'http://www.bar.com',
  helpUrl: 'http://www.helpUrl.com',
  ownerUrl: 'http://www.ownerUrl.com',
  ui: uiBlob,
  active: true,
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
  version: '1.0.0',
};

const nonActive = {
  name: n2,
  url: 'http://www.bar.com',
  helpUrl: 'http://www.bar.com',
  ownerUrl: 'http://www.bar.com',
  ui: uiBlob,
  active: false,
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
        {
          name: 'Param1',
          type: 'BOOLEAN',
        },
        {
          name: 'Param2',
          type: 'INTEGER',
        },
        {
          name: 'Param3',
          type: 'DECIMAL',
        },
        {
          name: 'Param4',
          type: 'STRING',
        },
      ],
    },
  ],
  data: [
    {
      name: 'Data1',
      type: 'BOOLEAN',
    },
    {
      name: 'Data2',
      type: 'INTEGER',
    },
    {
      name: 'Data3',
      type: 'DECIMAL',
    },
    {
      name: 'Data4',
      type: 'STRING',
    },
    {
      name: 'Data5',
      type: 'ARRAY',
    },
  ],
  version: '1.0.0',
};

module.exports = {
  name: n,
  displayName,
  standard,

  nameNonActive: n2,

  getStandard() {
    return JSON.parse(JSON.stringify(standard));
  },

  createNonActive() {
    return tu.db.Bot.create(nonActive);
  },

  createStandard(userId) {
    const standardBot = standard;
    standardBot.installedBy = userId;
    return tu.db.Bot.create(standardBot);
  },

  getBasic(overrideProps={}) {
    if (!overrideProps.name) {
      delete overrideProps.name;
    }

    const defaultProps = JSON.parse(JSON.stringify(standard));
    return Object.assign(defaultProps, overrideProps);
  },

  createBasic(overrideProps={}) {
    const toCreate = this.getBasic(overrideProps);
    return tu.db.Bot.create(toCreate);
  },

  forceDelete(done, startTime=testStartTime) {
    tu.forceDelete(tu.db.Bot, startTime)
    .then(() => done())
    .catch(done);
  },
};
