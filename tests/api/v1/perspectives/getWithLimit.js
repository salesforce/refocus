/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/perspectives/getWithLimit.js
 */
'use strict';
const tu = require('../../../testUtils');
const u = require('./utils');
const getWithLimit = require('../common/getWithLimit.js').getWithLimit;
const Perspective = tu.db.Perspective;
const path = '/v1/perspectives';

describe('tests/api/v1/perspectives/getWithLimit.js >', () => {
  const modelList = [];

  before((done) => {
    u.doSetup()
    .then((createdLens) => {
      const obj = {
        name: `${tu.namePrefix}testPersp`,
        lensId: createdLens.id,
        rootSubject: 'myMainSubject',
        aspectFilter: ['temperature', 'humidity'],
        aspectTagFilter: ['temp', 'hum'],
        subjectTagFilter: ['ea', 'na'],
        statusFilter: ['Critical', '-OK'],
      };
      for (let i = 0; i < 10; i++) {
        const toCreate = JSON.parse(JSON.stringify(obj));
        toCreate.name += `-limitTest${i}-${i % 2 ? 'odd' : 'even'}`;
        modelList.push(toCreate);
      }
    })
    .then(() => Perspective.bulkCreate(modelList))
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  getWithLimit(path);
});
