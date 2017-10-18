/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/lenses/getWithLimit.js
 */
'use strict';
const tu = require('../../../testUtils');
const u = require('./utils');
const getWithLimit = require('../common/getWithLimit.js').getWithLimit;
const Lens = tu.db.Lens;
const path = '/v1/lenses';

describe('tests/api/v1/lenses/getWithLimit.js >', () => {
  const modelList = [];

  before((done) => {
    for (let i = 0; i < 10; i++) {
      const toCreate = u.getLens();
      toCreate.name += `-limitTest${i}-${i % 2 ? 'odd' : 'even'}`;
      modelList.push(toCreate);
    }

    Lens.bulkCreate(modelList)
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  getWithLimit(path);
});
