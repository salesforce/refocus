/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/getWithLimit.js
 */
'use strict';
const tu = require('../../../testUtils');
const u = require('./utils');
const getWithLimit = require('../common/getWithLimit.js').getWithLimit;
const Collector = tu.db.Collector;
const path = '/v1/collectors';

describe('tests/api/v1/collectors/getWithLimit.js >', () => {
  const modelList = [];

  before((done) => {
    for (let i = 0; i < 10; i++) {
      const toCreate = JSON.parse(JSON.stringify(u.toCreate));
      toCreate.name += `-limitTest${i}-${i % 2 ? 'odd' : 'even'}`;
      modelList.push(toCreate);
    }

    Collector.bulkCreate(modelList)
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  getWithLimit(path);
});
