/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/tokenReq/api/tokens/utils.js
 */

const tu = require('../../../testUtils');

const testStartTime = new Date();

module.exports = {
  fakeUserCredentials: {
    email: 'user1@abc.com',
    password: 'fakePasswd',
    username: 'user1'
  },
  forceDelete(done) {
    tu.forceDelete(tu.db.User, testStartTime)
    .then(() => tu.forceDelete(tu.db.Profile, testStartTime))
    .then(() => tu.forceDelete(tu.db.Token, testStartTime))
    .then(() => done())
    .catch((err) => done(err));
  },
};
