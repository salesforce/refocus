/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /tests/db/model/user/create.js
 */
'use strict';  // eslint-disable-line strict

const bcrypt = require('bcrypt-nodejs');
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Profile = tu.db.Profile;
const User = tu.db.User;

describe('tests/db/model/user/create.js, db: User: create >', () => {
  let user = {};

  beforeEach((done) => {
    Profile.create({
      name: tu.namePrefix + 1,
    })
    .then((createdProfile) => User.create({
      profileId: createdProfile.id,
      name: `${tu.namePrefix}1`,
      email: 'user@example.com',
      password: 'user123password',
    }))
    .then((createdUser) => {
      user = createdUser;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('expects correct user parameters', (done) => {
    expect(user).to.have.property('name').to.equal(`${tu.namePrefix}1`);
    expect(user).to.have.property('email').to.equal('user@example.com');
    expect(user.password).to.not.equal('user123password');
    bcrypt.compare('user123password', user.password, (err, res) => {
      if (err) {
        throw err;
      }

      expect(res).to.be.true; // eslint-disable-line no-unused-expressions
    });
    done();
  });
});
