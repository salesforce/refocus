/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/user/update.js
 */

'use strict';  // eslint-disable-line strict

const bcrypt = require('bcrypt-nodejs');
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const User = tu.db.User;
const Profile = tu.db.Profile;

describe('db: user: update: ', () => {
  let user = {};
  beforeEach((done) => {
    Profile.create({
      name: tu.namePrefix + 1,
    })
    .then((createdProfile) => {
      return User.create({
        profileId: createdProfile.id,
        name: `${tu.namePrefix}1`,
        email: 'user@example.com',
        password: 'user123password',
      });
    })
    .then((createdUser) => {
      user = createdUser;
      done();
    })
    .catch((err) => done(err));
  });

  afterEach(u.forceDelete);

  it('update password', (done) => {
    user.update({ password: 'changedPwd789' })
    .then((returnedUser) => {
      bcrypt.compare('user123password', returnedUser.password, (err, res) => {
        if(err){
          throw err;
        }
        expect(res).to.be.false;  // eslint-disable-line no-unused-expressions
      });

      bcrypt.compare('changedPwd789', returnedUser.password, (err, res) => {
        if(err){
          throw err;
        }
        expect(res).to.be.true;  // eslint-disable-line no-unused-expressions
      });
    })
    .catch((err) => done(err));
    done();
  });
});
