/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/user/noLoginsSince.js
 */
'use strict';  // eslint-disable-line strict
const tu = require('../../../testUtils');
const u = require('./utils');
const expect = require('chai').expect;
const User = tu.db.User;
const Token = tu.db.Token;
const Profile = tu.db.Profile;
const SIXTY_FIVE_SECONDS = 65000;
const TWENTY_FIVE_HOURS = 90000000;
const FORTY_DAYS = 3456000000;
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const FOUR = 4;

describe('tests/db/model/user/noLoginsSince.js >', () => {
  let users;
  const sixtyFiveSecondsAgo = new Date(new Date() - SIXTY_FIVE_SECONDS);
  const twentyFiveHoursAgo = new Date(new Date() - TWENTY_FIVE_HOURS);
  const fortyDaysAgo = new Date(new Date() - FORTY_DAYS);

  before((done) => {
    Profile.create({ name: `${tu.namePrefix}1` })
    .then((createdProfile) => User.bulkCreate([
      {
        profileId: createdProfile.id,
        name: `${tu.namePrefix}1`,
        email: 'user@example.com',
        password: 'user123password',
        fullName: 'user fullName',
        lastLogin: sixtyFiveSecondsAgo,
      },
      {
        profileId: createdProfile.id,
        name: `${tu.namePrefix}2`,
        email: 'user2@example.com',
        password: 'user123password',
        fullName: 'user2 fullName',
        lastLogin: twentyFiveHoursAgo,
      },
      {
        profileId: createdProfile.id,
        name: `${tu.namePrefix}3`,
        email: 'user3@example.com',
        password: 'user123password',
        fullName: 'user3 fullName',
        lastLogin: fortyDaysAgo,
      },
    ]))
    .then((newUsers) => {
      users = newUsers;
    })
    .then(() => Token.bulkCreate([
      {
        name: `${tu.namePrefix}u1t1`,
        lastUsed: sixtyFiveSecondsAgo,
        createdBy: users[ZERO].id,
      },
      {
        name: `${tu.namePrefix}u1t2`,
        lastUsed: sixtyFiveSecondsAgo,
        createdBy: users[ZERO].id,
        isRevoked: 1827272829292,
      },
      {
        name: `${tu.namePrefix}u2t1`,
        lastUsed: sixtyFiveSecondsAgo,
        createdBy: users[ONE].id,
      },
    ]))
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  it('since 1m ago', (done) => {
    User.scope({ method: ['noLoginsSince', '-1m'] }).findAll()
    .then((usersFound) => {
      /* 4 found cuz includes OOTB admin */
      expect(usersFound).to.have.property('length', FOUR);
      expect(usersFound[ZERO].tokens).to.have.property('length', TWO);
      expect(usersFound[ONE].tokens).to.have.property('length', ONE);
      expect(usersFound[TWO].tokens).to.have.property('length', ZERO);
      done();
    })
    .catch(done);
  });

  it('since -1d', (done) => {
    User.scope({ method: ['noLoginsSince', '-1d'] }).findAll()
    .then((usersFound) => expect(usersFound).to.have.property('length', TWO))
    .then(() => done())
    .catch(done);
  });

  it('since -30d', (done) => {
    User.scope({ method: ['noLoginsSince', '-30d'] }).findAll()
    .then((usersFound) => expect(usersFound).to.have.property('length', ONE))
    .then(() => done())
    .catch(done);
  });

  it('since -60d', (done) => {
    User.scope({ method: ['noLoginsSince', '-60d'] }).findAll()
    .then((usersFound) => expect(usersFound).to.have.property('length', ZERO))
    .then(() => done())
    .catch(done);
  });

  it('invalid time', (done) => {
    const msg =
      'invalid input syntax for type timestamp with time zone: "Invalid date"';
    User.scope({ method: ['noLoginsSince', 'Hello, World'] }).findAll()
    .then(() => done(new Error('Expecting error')))
    .catch((err) => {
      expect(err).to.have.property('message', msg);
      done();
    });
  });
});
