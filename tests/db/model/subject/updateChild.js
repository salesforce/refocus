/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/subject/updateChild.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const Profile = tu.db.Profile;
const User = tu.db.User;

describe('tests/db/model/subject/updateChild.js >', () => {
  after(u.forceDelete);

  describe('Kids >', () => {
    let subjId1;
    let childId1;
    let childId2;

    beforeEach((done) => {
      const myParent1 = u
      .getSubjectPrototype(`${tu.namePrefix}parent1`, null);
      Subject.create(myParent1)
      .then((created1) => {
        subjId1 = created1.id;
      })
      .then(() => {
        const myChild1 = u
        .getSubjectPrototype(`${tu.namePrefix}child1`, subjId1);
        return Subject.create(myChild1);
      })
      .then((c1) => {
        childId1 = c1.id;
      })
      .then(() => {
        const myChild2 = u
        .getSubjectPrototype(`${tu.namePrefix}child2`, childId1);
        return Subject.create(myChild2);
      })
      .then((c2) => {
        childId2 = c2.id;
        done();
      })
      .catch(done);
    });

    afterEach(u.forceDelete);

    describe('update sortBy >', () => {
      it('update parent sort By, should not change child sort By',
      (done) => {
        Subject.findByPk(subjId1)
        .then((parent) => {
          expect(parent.get('sortBy')).to.equal(null);
          parent.update({ sortBy: 'xyz' });
          expect(parent.get('sortBy')).to.equal('xyz');
        })
        .then(() => Subject.findByPk(childId1))
        .then((child) => {
          expect(child.get('sortBy')).to.equal(null);
          done();
        })
        .catch(done);
      });

      it('update sort By field to a non empty string from null and it should be accepted',
      (done) => {
        Subject.findByPk(subjId1)
         .then((parent) => {
          expect(parent.get('sortBy')).to.equal(null);
          parent.update({ sortBy: 'xyz' });
          expect(parent.get('sortBy')).to.equal('xyz');
          done();
        })
        .catch(done);
      });

      it('update sort By field to null from non empty string and it should be accepted',
      (done) => {
        Subject.findByPk(subjId1)
         .then((parent) => {
          parent.sortBy = 'abc';
          expect(parent.get('sortBy')).to.equal('abc');
          parent.update({ sortBy: null });
          expect(parent.get('sortBy')).to.equal(null);
          done();
        })
        .catch(done);
      });

      it('update sort By field to empty string from non empty string and it should be accepted',
      (done) => {
        Subject.findByPk(subjId1)
         .then((parent) => {
          parent.sortBy = 'abc';
          expect(parent.get('sortBy')).to.equal('abc');
          parent.update({ sortBy: '' });
          expect(parent.get('sortBy')).to.equal('');
          done();
        })
        .catch(done);
      });
    });

    describe('update child >', ()=> {
      it('update child helpEmail, should not change parent subject',
      (done) => {
        Subject.findByPk(childId1)
        .then((child) => {
          expect(child.get('helpEmail')).to.equal('foo@bar.com');
          child.update({ helpEmail: 'foobaz@bar.com' });
          expect(child.get('helpEmail')).to.equal('foobaz@bar.com');
        })
        .then(() => Subject.findByPk(subjId1))
        .then((parent) => {
          expect(parent.get('helpEmail')).to.equal('foo@bar.com');
          done();
        })
        .catch(done);
      });

      it('update child helpUrl, should not change parent subject',
      (done) => {
        Subject.findByPk(childId1)
        .then((child) => {
          expect(child.get('helpUrl')).to.equal('http://www.bar.com');
          child.update({ helpUrl: 'http://www.foobar.com' });
          expect(child.get('helpUrl')).to.equal('http://www.foobar.com');
        })
        .then(() => Subject.findByPk(subjId1))
        .then((parent) => {
          expect(parent.get('helpUrl')).to.equal('http://www.bar.com');
          done();
        })
        .catch(done);
      });

      it('update child imageUrl, should not change parent subject',
      (done) => {
        Subject.findByPk(childId1)
        .then((child) => {
          expect(child.get('imageUrl'))
          .to.equal('http://www.bar.com/foo.jpg');
          child.update({ imageUrl: 'http://www.zoobar.com/foo.jpg' });
          expect(child.get('imageUrl'))
          .to.equal('http://www.zoobar.com/foo.jpg');
        })
        .then(() => Subject.findByPk(subjId1))
        .then((parent) => {
          expect(parent.get('imageUrl'))
            .to.equal('http://www.bar.com/foo.jpg');
          done();
        })
        .catch(done);
      });

      it('update child isPublished, should not change parent subject',
      (done) => {
        Subject.findByPk(childId2)
        .then((child) => {
          expect(child.get('isPublished')).to.equal(true);
          child.update({ isPublished: false });
          expect(child.get('isPublished')).to.equal(false);
        })
        .then(() => Subject.findByPk(childId1))
        .then((parent) => {
          expect(parent.get('isPublished')).to.equal(true);
          done();
        })
        .catch(done);
      });

      it('update child sort By, should not change parent sort By',
      (done) => {
        Subject.findByPk(childId2)
        .then((child) => {
          expect(child.get('sortBy')).to.equal(null);
          child.update({ sortBy: 'xyz' });
          expect(child.get('sortBy')).to.equal('xyz');
        })
        .then(() => Subject.findByPk(childId1))
        .then((parent) => {
          expect(parent.get('sortBy')).to.equal(null);
          done();
        })
        .catch(done);
      });
    });

    describe('isWritableBy >', () => {
      let prof;
      let subjUnprotected;
      let subjProtected;
      let user1;
      let user2;

      before((done) => {
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
          const s = u.getSubjectPrototype(`${tu.namePrefix}France`);
          return Subject.create(s);
        })
        .then((subject) => {
          subjUnprotected = subject;
          const s = u.getSubjectPrototype(`${tu.namePrefix}Belgium`);
          s.name += 'Protected';
          return Subject.create(s);
        })
        .then((subject) => {
          subjProtected = subject;
          return subject.addWriters([user1]);
        })
        .then(() => done())
        .catch(done);
      });

      after(u.forceDelete);

      it('subject is write-protected, isWritableBy false', (done) => {
        subjProtected.isWritableBy(user2.name)
        .then((isWritableBy) => {
          expect(isWritableBy).to.be.false;
          done();
        })
        .catch(done);
      });

      it('subject is not write-protected, isWritableBy true', (done) => {
        subjUnprotected.isWritableBy(user1.name)
        .then((isWritableBy) => {
          expect(isWritableBy).to.be.true;
          done();
        })
        .catch(done);
      });

      it('subject is write-protected, isWritableBy true', (done) => {
        subjProtected.isWritableBy(user1.name)
        .then((isWritableBy) => {
          expect(isWritableBy).to.be.true;
          done();
        })
        .catch(done);
      });
    });
  });
});
