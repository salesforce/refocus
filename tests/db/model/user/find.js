/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/user/find.js
 */
'use strict';  // eslint-disable-line strict
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const User = tu.db.User;
const Profile = tu.db.Profile;

describe('db: user: find: ', () => {
  beforeEach((done) => {
    Profile.create({ name: `${tu.namePrefix}1` })
    .then((createdProfile) => {
      return User.create({
        profileId: createdProfile.id,
        name: `${tu.namePrefix}1`,
        email: 'user@example.com',
        password: 'user123password',
      });
    })
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('default scope no password', (done) => {
    User.find({ name: `${tu.namePrefix}1` })
    .then((found) => {
      expect(found.dataValues).to.not.have.property('password');
      done();
    })
    .catch(done);
  });

  it('withSensitiveInfo scope', (done) => {
    User.scope('withSensitiveInfo').find({ name: `${tu.namePrefix}1` })
    .then((found) => {
      expect(found.dataValues).to.have.property('password');
      done();
    })
    .catch(done);
  });
});
