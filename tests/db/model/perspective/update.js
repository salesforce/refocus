/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/perspective/update.js
 */
'use strict';
const path = require('path');
const fs = require('fs');
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const Lens = tu.db.Lens;
const Perspective = tu.db.Perspective;
const User = tu.db.User;
const Profile = tu.db.Profile;

describe('tests/db/model/perspective/update.js >', () => {
  let prof;
  let subj;
  let lensId;
  let perspUnprotected;
  let perspProtected;
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
      return Subject.create({
        name: `${tu.namePrefix}ABC`,
        isPublished: true,
      });
    })
    .then((subject) => {
      subj = subject;
      return Lens.create({
        name: `${tu.namePrefix}Lens`,
        sourceName: `${tu.namePrefix}Lens`,
        description: 'description',
        sourceDescription: 'sourceDescription',
        isPublished: true,
        library: lensLibrary,
      });
    })
    .then((lens) => {
      lensId = lens.id;
      return Perspective.create({
        name: `${tu.namePrefix}UnprotectedPerspective`,
        rootSubject: subj.absolutePath,
        lensId,
      });
    })
    .then((persp) => {
      perspUnprotected = persp;
      return Perspective.create({
        name: `${tu.namePrefix}ProtectedPerspective`,
        rootSubject: subj.absolutePath,
        lensId,
      });
    })
    .then((persp) => {
      perspProtected = persp;
      return perspProtected.addWriters([user1]);
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  it('perspective is not write-protected, isWritableBy true', (done) => {
    perspUnprotected.isWritableBy(user1.name)
    .then((isWritableBy) => {
      expect(isWritableBy).to.be.true;
      done();
    })
    .catch(done);
  });

  it('perspective is write-protected, isWritableBy true', (done) => {
    perspProtected.isWritableBy(user1.name)
    .then((isWritableBy) => {
      expect(isWritableBy).to.be.true;
      done();
    })
    .catch(done);
  });

  it('perspective is write-protected, isWritableBy false', (done) => {
    perspProtected.isWritableBy(user2.name)
    .then((isWritableBy) => {
      expect(isWritableBy).to.be.false;
      done();
    })
    .catch(done);
  });

  it('returns correct profile access field name', (done) => {
    expect(Perspective.getProfileAccessField()).to.equal('perspectiveAccess');
    done();
  });
}); // db: lens: update: permission:
