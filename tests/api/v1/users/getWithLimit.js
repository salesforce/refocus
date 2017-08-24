/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/users/getWithLimit.js
 */
'use strict';
const tu = require('../../../testUtils');
const u = require('./utils');
const getWithLimit = require('../common/getWithLimit.js').getWithLimit;
const User = tu.db.User;
const path = '/v1/users';

describe('tests/api/v1/users/getWithLimit.js >', () => {
  const modelList = [];

  before(u.forceDelete);
  before(tu.forceDeleteUser);

  before((done) => {
    const uname = `${tu.namePrefix}test@refocus.com`;
    const obj = {
      name: uname,
      email: uname,
      password: 'user123password',
    };
    for (let i = 0; i < 10; i++) {
      const toCreate = JSON.parse(JSON.stringify(obj));
      toCreate.name += `-limitTest${i}-${i % 2 ? 'odd' : 'even'}`;
      modelList.push(toCreate);
    }

    User.bulkCreate(modelList)
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  getWithLimit(path);
});
