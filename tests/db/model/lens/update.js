/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/lens/update.js
 */
'use strict';
const path = require('path');
const fs = require('fs');
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Lens = tu.db.Lens;
const User = tu.db.User;
const Profile = tu.db.Profile;

describe('tests/db/model/lens/update.js >', () => {
  let prof;
  let lensUnprotected;
  let lensProtected;
  let user1;
  let user2;

  before((done) => {
    const mt = path.join(__dirname, './MultiTable.zip');
    const lensLibrary = fs.readFileSync(mt); // eslint-disable-line no-sync
    Profile.create({
      name: tu.namePrefix + '1',
    })
    .then((createdProfile) => {
      prof = createdProfile.id;
      return User.create({
        profileId: prof,
        name: `${tu.namePrefix}user1@example.com`,
        email: 'user1@example.com',
        password: 'user123password',
      });
    })
    .then((createdUser) => {
      user1 = createdUser;
      return User.create({
        profileId: prof,
        name: `${tu.namePrefix}user2@example.com`,
        email: 'user2@example.com',
        password: 'user223password',
      });
    })
    .then((createdUser) => {
      user2 = createdUser;
      return Lens.create({
        name: `${tu.namePrefix}UnprotectedLens`,
        sourceName: `${tu.namePrefix}UnprotectedLens`,
        description: 'description',
        sourceDescription: 'sourceDescription',
        isPublished: true,
        library: lensLibrary,
      });
    })
    .then((lens) => {
      lensUnprotected = lens;
      return Lens.create({
        name: `${tu.namePrefix}ProtectedLens`,
        sourceName: `${tu.namePrefix}ProtectedLens`,
        description: 'description',
        sourceDescription: 'sourceDescription',
        isPublished: true,
        library: lensLibrary,
      });
    })
    .then((lens) => {
      lensProtected = lens;
      return lensProtected.addWriters([user1]);
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  it('lens is not write-protected, isWritableBy true', (done) => {
    lensUnprotected.isWritableBy(user1.name)
    .then((isWritableBy) => {
      expect(isWritableBy).to.be.true;
      done();
    })
    .catch(done);
  });

  it('lens is write-protected, isWritableBy true', (done) => {
    lensProtected.isWritableBy(user1.name)
    .then((isWritableBy) => {
      expect(isWritableBy).to.be.true;
      done();
    })
    .catch(done);
  });

  it('lens is write-protected, isWritableBy false', (done) => {
    lensProtected.isWritableBy(user2.name)
    .then((isWritableBy) => {
      expect(isWritableBy).to.be.false;
      done();
    })
    .catch(done);
  });

  it('returns correct profile access field name', (done) => {
    expect(Lens.getProfileAccessField()).to.equal('lensAccess');
    done();
  });
}); // db: lens: update: permission:
