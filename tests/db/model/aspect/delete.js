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
'use strict';
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const Aspect = tu.db.Aspect;
const Profile = tu.db.Profile;
const User = tu.db.User;
const Subject = tu.db.Subject;

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
      .then((o) => {
        if (o.deletedAt && o.isDeleted) {
          done();
        } else {
          done(new Error('expecting it to be soft-deleted'));
        }
      })
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
      .then((o) => {
        if (o.deletedAt && o.isDeleted) {
          // console.log(o.dataValues.Tags);
          done();
        } else {
          done(new Error('expecting it to be soft-deleted'));
        }
      })
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
      .then((o) => {
        if (o.deletedAt && o.isDeleted) {
          expect(o.dataValues.relatedLinks[0]).to.have.property('name')
          .to.equal('destroyRelatedLink');
          expect(o.dataValues.relatedLinks[0]).to.have.property('url')
          .to.equal('https://fakelink.com');
          expect(o.dataValues).to.have.property('isDeleted').to.not.equal(0);
          expect(o.dataValues).to.have.property('deletedAt').to.not.equal(null);
          done();
        } else {
          done(new Error('expecting it to be soft-deleted'));
        }
      })
      .catch(done);
    });
  });

  describe('sample >', () => {
    afterEach(u.forceDelete);
    let id = 0;
    beforeEach((done) => {
      Aspect.create({
        isPublished: true,
        name: `${tu.namePrefix}Aspect`,
        timeout: '30s',
        valueType: 'NUMERIC',
      })
      .then((created) => {
        id = created.id;
      })
      .then(() => Subject.create({
        isPublished: true,
        name: `${tu.namePrefix}Subject`,
      }))
      .then(() => done())
      .catch(done);
    });

    it('with sample', (done) => {
      Sample.upsertByName({
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect`,
        value: '1',
      })
      .then((o) => {
        // console.log(o.dataValues.value);
        // console.log(o.dataValues);
        expect(o.dataValues).to.have.deep.property('value', '1');
      })
      .then(() => Aspect.findById(id))
      .then((o) => o.destroy())
      .then((o) => {
        if (o.deletedAt && o.isDeleted) {
          // console.log(o.dataValues);
          expect(o.dataValues).to.have.property('isDeleted').to.not.equal(0);
          expect(o.dataValues).to.have.property('deletedAt').to.not.equal(null);
          done();
        } else {
          // console.log(o.dataValues);
          done(new Error('expecting it to be soft-deleted'));
        }
      })
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
