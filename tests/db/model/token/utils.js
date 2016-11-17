/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/token/utils.js
 */

'use strict';  // eslint-disable-line strict

const tu = require('../../../testUtils');

const testStartTime = new Date();
const pfx = '___';
const jwtUtil = require('../../../../utils/jwtUtil');
const tokenName = 'testTokenName';

module.exports = {
  forceDelete(done) {
    tu.forceDelete(tu.db.User, testStartTime)
    .then(() => tu.forceDelete(tu.db.Profile, testStartTime))
    .then(() => tu.forceDelete(tu.db.Token, testStartTime))
    .then(() => done())
    .catch((err) => done(err));
  },

  createTokenObject() {
    return tu.db.Profile.create({
      name: `${pfx}testProfile`,
    })
    .then((createdProfile) =>
      tu.db.User.create({
        profileId: createdProfile.id,
        name: `${pfx}test@refocus.com`,
        email: `${pfx}test@refocus.com`,
        password: 'user123password',
      })
    )
    .then((returnedUser) => {
      // create token
      const token = jwtUtil.createToken({
        name: returnedUser.name,
        email: returnedUser.email,
      });

      // create Token object
      return tu.db.Token.create({
        name: tokenName,
        token,
        createdBy: returnedUser.id,
      });
    });
  },
};
