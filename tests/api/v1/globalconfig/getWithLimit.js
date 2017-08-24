/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/globalconfig/getWithLimit.js
 */
'use strict';
const tu = require('../../../testUtils');
const u = require('./utils');
const getWithLimit = require('../common/getWithLimit.js').getWithLimit;
const GlobalConfig = tu.db.GlobalConfig;
const path = '/v1/globalconfig';

describe('tests/api/v1/globalconfig/getWithLimit.js >', () => {
  const modelList = [];

  before((done) => {
    const obj = {
      key: `${tu.namePrefix}_GLOBAL_CONFIG_ABC`,
      value: 'def',
    };

    for (let i = 0; i < 10; i++) {
      const toCreate = JSON.parse(JSON.stringify(obj));
      toCreate.key += `-limitTest${i}-${i % 2 ? 'odd' : 'even'}`;
      modelList.push(toCreate);
    }

    GlobalConfig.bulkCreate(modelList)
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  const skipWildcards = true;
  getWithLimit(path, skipWildcards);
});
