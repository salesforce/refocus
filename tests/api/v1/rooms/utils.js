/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/api/room/utils.js
 */
'use strict';
const tu = require('../../../testUtils');
const roomTypeUtil = require('../roomTypes/utils');

const testStartTime = new Date();
const n = `${tu.namePrefix}TestRoom`;
const n2 = n + 'NonActive';

const roomTypeSchema = {
  name: 'roomTypeTest',
  url: 'http://www.bar.com',
  active: true,
  actions: [
    {
      name: 'Action1',
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
};

const standard = {
  name: n,
  active: true,
};

const nonActive = {
  name: n2,
  active: true,
};

module.exports = {
  name: n,

  nameNonActive: n2,

  rtSchema: roomTypeSchema,

  getStandard() {
    return JSON.parse(JSON.stringify(standard));
  },

  getNonActive() {
    return JSON.parse(JSON.stringify(nonActive));
  },

  createNonActive() {
    return tu.db.Room.create(nonActive);
  },

  createStandard() {
    return tu.db.Room.create(standard);
  },

  getBasic(overrideProps={}) {
    if (!overrideProps.name) {
      delete overrideProps.name;
    }

    const defaultProps = JSON.parse(JSON.stringify(standard));
    return Object.assign(defaultProps, overrideProps);
  },

  doSetup(props={}) {
    const { createdBy, name } = props;
    return roomTypeUtil.createBasic({ createdBy, name })
    .then((roomType) => {
      const createdIds = {
        type: roomType.id,
      };
      return createdIds;
    });
  },

  createBasic(overrideProps={}) {
    const { createdBy, name } = overrideProps;
    return this.doSetup({ createdBy, name })
    .then(({ type }) => {
      Object.assign(overrideProps, { type });
      const toCreate = this.getBasic(overrideProps);
      return tu.db.Room.create(toCreate);
    });
  },

  getDependencyProps() {
    return ['type'];
  },

  forceDelete(done, startTime=testStartTime) {
    tu.forceDelete(tu.db.Room, startTime)
    .then(() => tu.forceDelete(tu.db.RoomType, startTime))
    .then(() => done())
    .catch(done);
  },
};
