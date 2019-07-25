/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/aspect/delete.js
 */
'use strict'; // eslint-disable-line strict
const chai = require('chai');
const expect = chai.expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;
const Profile = tu.db.Profile;
const User = tu.db.User;

describe('tests/db/model/aspect/delete.js', () => {
  describe('db: aspect: delete >', () => {
    beforeEach((done) => {
      u.createMedium()
      .then(() => done())
      .catch(done);
    });

    afterEach(u.forceDelete);

    it('simple', (done) => {
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => o.destroy())
      .then((o) => Aspect.findOne({ where: { name: u.name } }))
      .then((o) => expect(o).to.be.null)
      .then(() => done())
      .catch(done);
    });

    it('with tags', (done) => {
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => {
        o.tags = ['xxxxx'];
        return o.save();
      })
      .then(() => Aspect.findOne({ where: { name: u.name } }))
      .then((o) => o.destroy())
      .then((o) => Aspect.findOne({ where: { name: u.name } }))
      .then((o) => expect(o).to.be.null)
      .then(() => done())
      .catch(done);
    });

    it('with relatedLinks', (done) => {
      Aspect.findOne({ where: { name: u.name } })
      .then((o) => {
        o.relatedLinks = [
          { name: 'destroyRelatedLink', url: 'https://fakelink.com' },
        ];
        return o.save();
      })
      .then(() => Aspect.findOne({ where: { name: u.name } }))
      .then((o) => o.destroy())
      .then((o) => Aspect.findOne({ where: { name: u.name } }))
      .then((o) => expect(o).to.be.null)
      .then(() => done())
      .catch(done);
    });
  });

  describe('isWritableBy >', () => {
    let prof;
    let aspUnprotected;
    let aspProtected;
    let user1;
    let user2;

    beforeEach((done) => {
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
        const a = u.getSmall();
        return Aspect.create(a);
      })
      .then((aspect) => {
        aspUnprotected = aspect;
        const a = u.getSmall();
        a.name += 'Protected';
        return Aspect.create(a);
      })
      .then((aspect) => {
        aspProtected = aspect;
        return aspect.addWriters([user1]);
      })
      .then(() => done())
      .catch(done);
    });

    afterEach(u.forceDelete);

    it('aspect is not write-protected, isWritableBy true', (done) => {
      aspUnprotected.isWritableBy(user1.name)
      .then((isWritableBy) => {
        expect(isWritableBy).to.be.true;
        done();
      })
      .catch(done);
    });

    it('aspect is write-protected, isWritableBy true', (done) => {
      aspProtected.isWritableBy(user1.name)
      .then((isWritableBy) => {
        expect(isWritableBy).to.be.true;
        done();
      })
      .catch(done);
    });

    it('aspect is write-protected, isWritableBy false', (done) => {
      aspProtected.isWritableBy(user2.name)
      .then((isWritableBy) => {
        expect(isWritableBy).to.be.false;
        done();
      })
      .catch(done);
    });
  }); // isWritableBy
});
