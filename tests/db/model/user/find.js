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

describe('tests/db/model/user/find.js, db: user: find >', () => {
  beforeEach((done) => {
    Profile.create({ name: `${tu.namePrefix}1` })
    .then((createdProfile) => User.create({
      profileId: createdProfile.id,
      name: `${tu.namePrefix}1`,
      email: 'user@example.com',
      password: 'user123password',
      fullName: 'user fullName',
    }))
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('default scope no password', (done) => {
    User.findOne({ name: `${tu.namePrefix}1` })
    .then((found) => {
      expect(found.dataValues).to.not.have.property('password');
      expect(found.lastLogin).to.be.instanceof(Date);
      done();
    })
    .catch(done);
  });

  it('withSensitiveInfo scope', (done) => {
    User.scope('withSensitiveInfo').findOne({ name: `${tu.namePrefix}1` })
    .then((found) => {
      expect(found.dataValues).to.have.property('password');
      expect(found.lastLogin).to.be.instanceof(Date);
      done();
    })
    .catch(done);
  });

  it('returns correct profile access field name', (done) => {
    expect(User.getProfileAccessField()).to.equal('userAccess');
    done();
  });
});
