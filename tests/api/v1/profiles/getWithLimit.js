/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/profiles/getWithLimit.js
 */
'use strict';
const tu = require('../../../testUtils');
const u = require('./utils');
const getWithLimit = require('../common/getWithLimit.js').getWithLimit;
const Profile = tu.db.Profile;
const path = '/v1/profiles';

describe('tests/api/v1/profiles/getWithLimit.js >', () => {
  const modelList = [];

  before((done) => {
    const obj = {
      name: `${tu.namePrefix}testProfile`,
    };
    for (let i = 0; i < 10; i++) {
      const toCreate = JSON.parse(JSON.stringify(obj));
      toCreate.name += `-limitTest${i}-${i % 2 ? 'odd' : 'even'}`;
      modelList.push(toCreate);
    }

    Profile.bulkCreate(modelList)
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  const skipWildcards = true;
  getWithLimit(path, skipWildcards);
});
