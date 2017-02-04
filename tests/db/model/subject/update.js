/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/subject/update.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const Profile = tu.db.Profile;
const User = tu.db.User;

describe('db: subject: update: ', () => {
  after(u.forceDelete);

  describe('Kids', () => {
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

    it('on update parentAbsolutePath to "", child becomes root', (done) => {
      const parentName = `${tu.namePrefix}parent6`;
      let oldParentId;
      Subject.create({ name: parentName })
      .then((parent) => {
        oldParentId = parent.id;
        return Subject.findById(childId2);
      })
      .then((child) => child.update({ parentAbsolutePath: parentName }))
      .then((child) => {
        // check child subject references parent correctly,
        // before making itself root
        expect(child.dataValues.parentId).to.equal(oldParentId);
        expect(child.dataValues.parentAbsolutePath).to.equal(parentName);
        return child.update({ parentAbsolutePath: '' });
      })
      .then((child) => {
        expect(child.dataValues.parentAbsolutePath).to.be.null;
        expect(child.dataValues.parentId).to.be.null;
        done();
      })
      .catch(done);
    });

    it('on update parentId to null, child becomes root', (done) => {
      const parentName = `${tu.namePrefix}parent7`;
      let childPath;
      let oldParentId;
      Subject.create({ name: parentName })
      .then((parent) => {
        oldParentId = parent.id;
        return Subject.findById(childId2);
      })
      .then((child) => child.update({ parentAbsolutePath: parentName }))
      .then((child) => {
        childPath = child.absolutePath;
        expect(child.dataValues.parentId).to.equal(oldParentId);
        return child.update({ parentId: null });
      })
      .then((child) => {
        expect(child.dataValues.parentAbsolutePath).to.be.null;
        expect(child.dataValues.parentId).to.be.null;
        const newChildPath = childPath.split('.').pop();
        expect(child.dataValues.absolutePath).to.equal(newChildPath);
        done();
      })
      .catch(done);
    });

    it('on update child name, child should remain parented', (done) => {
      const childName = 'achoo';
      let oldParentId = null;
      let oldParentAbsolutePath = null;
      Subject.findById(childId2)
      .then((child) => {
        oldParentId = child.parentId;
        oldParentAbsolutePath = child.parentAbsolutePath;
        return child.update({ name: childName });
      })
      .then((child) => {
        expect(child.dataValues.parentId).to.equal(oldParentId);
        expect(child.dataValues.parentAbsolutePath)
          .to.equal(oldParentAbsolutePath);
        done();
      })
      .catch(done);
    });

    it('on parentAbsolutePath change, childCount of old ' +
    'parent is decremented', (done) => {
      const parentName = `${tu.namePrefix}parent3`;
      let oldParentId = '';
      Subject.create({ name: parentName })
      .then(() => Subject.findById(childId1))
      .then((child) => {
        oldParentId = child.parentId;
        return child.update({ parentAbsolutePath: parentName });
      })
      .then(() => Subject.findById(oldParentId))
      .then((oldParent) => {
        expect(oldParent.dataValues.childCount).to.equal(0);
        done();
      })
      .catch(done);
    });

    it('on parentAbsolutePath change, childCount of new ' +
    'parent is incremented', (done) => {
      const parentName = `${tu.namePrefix}parent3`;
      Subject.create({ name: parentName })
      .then(() => Subject.findById(childId1))
      .then((child) => child.update({ parentAbsolutePath: parentName }))
      .then(() => Subject.findOne({ where: { name: parentName } }))
      .then((parent) => {
        expect(parent.dataValues.childCount).to.equal(1);
        done();
      })
      .catch(done);
    });

    it('on parentAbsolutePath change, child"s parentAbsolutePath ' +
    'and absolutePath is changed', (done) => {
      const parentName = `${tu.namePrefix}parent3`;
      Subject.create({ name: parentName })
      .then(() => Subject.findById(childId2))
      .then((child) => child.update({ parentAbsolutePath: parentName }))
      .then((child) => {
        expect(child.dataValues.absolutePath).to
        .equal(`${parentName}.${tu.namePrefix}child2`);
        expect(child.dataValues.parentAbsolutePath).to.equal(parentName);
        done();
      })
      .catch(done);
    });

    it('on parentAbsolutePath change, ' +
    'child"s absolutePath is updated', (done) => {
      const parentName = `${tu.namePrefix}parent2`;
      Subject.create({ name: parentName })
      .then(() => Subject.findById(childId2))
      .then((subj) => subj.update({ parentAbsolutePath: parentName }))
      .then((subj) => {
        expect(subj.dataValues.parentAbsolutePath).to.equal(parentName);
        expect(subj.dataValues.absolutePath).to
        .equal(`${tu.namePrefix}parent2.${tu.namePrefix}child2`);
        done();
      })
      .catch(done);
    });

    it('ok, child absolutePath is updated when parent name is updated',
    (done) => {
      Subject.findById(subjId1)
      .then((parent) => parent.update({ name: `${parent.get('name')}_UP` }))
      .then(() => {
        setTimeout(() => {
          Subject.findById(childId1)
          .then((child) => {
            expect(child.get('absolutePath'))
            .to.equal(`${tu.namePrefix}parent1_UP.${tu.namePrefix}child1`);
            done();
          })
          .catch(done);
        }, 500);
      })
      .catch(done);
    });

    it('update parent helpEmail, should not change child subject',
    (done) => {
      Subject.findById(subjId1)
      .then((parent) => {
        expect(parent.get('helpEmail')).to.equal('foo@bar.com');
        parent.update({ helpEmail: 'foobaz@bar.com' });
        expect(parent.get('helpEmail')).to.equal('foobaz@bar.com');
      })
      .then(() => Subject.findById(childId1))
      .then((child) => {
        expect(child.get('helpEmail')).to.equal('foo@bar.com');
        done();
      })
      .catch(done);
    });
      
    it('update parent sort By, should not change child sort By',
    (done) => {
      Subject.findById(subjId1)
      .then((parent) => {
        expect(parent.get('sortBy')).to.equal('abc');
        parent.update({ sortBy: 'xyz' });
        expect(parent.get('sortBy')).to.equal('xyz');
      })
      .then(() => Subject.findById(childId1))
      .then((child) => {
        expect(child.get('sortBy')).to.equal('abc');
        done();
      })
      .catch(done);
    });

    it('update parent helpUrl, should not change child subject',
    (done) => {
      Subject.findById(subjId1)
      .then((parent) => {
        expect(parent.get('helpUrl')).to.equal('http://www.bar.com');
        parent.update({ helpUrl: 'http://www.foobar.com' });
        expect(parent.get('helpUrl')).to.equal('http://www.foobar.com');
      })
      .then(() => Subject.findById(childId1))
      .then((child) => {
        expect(child.get('helpUrl')).to.equal('http://www.bar.com');
        done();
      })
      .catch(done);
    });

    it('update parent imageUrl, should not change child subject',
    (done) => {
      Subject.findById(subjId1)
      .then((parent) => {
        expect(parent.get('imageUrl'))
        .to.equal('http://www.bar.com/foo.jpg');
        parent.update({ imageUrl: 'http://www.zoobar.com/foo.jpg' });
        expect(parent.get('imageUrl'))
        .to.equal('http://www.zoobar.com/foo.jpg');
      })
      .then(() => Subject.findById(childId1))
      .then((child) => {
        expect(child.get('imageUrl'))
        .to.equal('http://www.bar.com/foo.jpg');
        done();
      })
      .catch(done);
    });

    it('update child helpEmail, should not change parent subject',
    (done) => {
      Subject.findById(childId1)
      .then((child) => {
        expect(child.get('helpEmail')).to.equal('foo@bar.com');
        child.update({ helpEmail: 'foobaz@bar.com' });
        expect(child.get('helpEmail')).to.equal('foobaz@bar.com');
      })
      .then(() => Subject.findById(subjId1))
      .then((parent) => {
        expect(parent.get('helpEmail')).to.equal('foo@bar.com');
        done();
      })
      .catch(done);
    });

    it('update child helpUrl, should not change parent subject',
    (done) => {
      Subject.findById(childId1)
      .then((child) => {
        expect(child.get('helpUrl')).to.equal('http://www.bar.com');
        child.update({ helpUrl: 'http://www.foobar.com' });
        expect(child.get('helpUrl')).to.equal('http://www.foobar.com');
      })
      .then(() => Subject.findById(subjId1))
      .then((parent) => {
        expect(parent.get('helpUrl')).to.equal('http://www.bar.com');
        done();
      })
      .catch(done);
    });

    it('update child imageUrl, should not change parent subject',
    (done) => {
      Subject.findById(childId1)
      .then((child) => {
        expect(child.get('imageUrl'))
        .to.equal('http://www.bar.com/foo.jpg');
        child.update({ imageUrl: 'http://www.zoobar.com/foo.jpg' });
        expect(child.get('imageUrl'))
        .to.equal('http://www.zoobar.com/foo.jpg');
      })
      .then(() => Subject.findById(subjId1))
      .then((parent) => {
        expect(parent.get('imageUrl'))
          .to.equal('http://www.bar.com/foo.jpg');
        done();
      })
      .catch(done);
    });

    it('update child isPublished, should not change parent subject',
    (done) => {
      Subject.findById(childId2)
      .then((child) => {
        expect(child.get('isPublished')).to.equal(true);
        child.update({ isPublished: false });
        expect(child.get('isPublished')).to.equal(false);
      })
      .then(() => Subject.findById(childId1))
      .then((parent) => {
        expect(parent.get('isPublished')).to.equal(true);
        done();
      })
      .catch(done);
    });
      
    it('update child sort By, should not change parent sort By',
    (done) => {
      Subject.findById(childId2)
      .then((child) => {
        expect(child.get('sortBy')).to.equal('abc');
        child.update({ sortBy: 'xyz' });
        expect(child.get('sortBy')).to.equal('xyz');
      })
      .then(() => Subject.findById(childId1))
      .then((parent) => {
        expect(parent.get('sortBy')).to.equal('abc');
        done();
      })
      .catch(done);
    });

    it('ok, child absolutePath is updated with new parent and old parent',
    (done) => {
      let subjId2;
      const myParent2 = u.getSubjectPrototype(`${tu.namePrefix}parent2`, null);
      Subject.create(myParent2)
      .then((created) => {
        subjId2 = created.id;
      })
      .then(() => Subject.findById(subjId1))
      .then((parent1) => parent1.update({ parentId: subjId2 }))
      .then(() => {
        setTimeout(() => {
          Subject.findById(childId1)
          .then((child) => {
            expect(child.get('absolutePath'))
              .to.equal(`${tu.namePrefix}parent2.` +
                `${tu.namePrefix}parent1.${tu.namePrefix}child1`);
            done();
          })
          .catch(done);
        }, 500);
      })
      .catch(done);
    });

    /*
     * Visual depiction below:
     * Before                             After
     * O<= root parent1 O <= new parent2  * O<= root parent1 O<= new parent2
     * |               /|                 * |                |
     * O<= child1     / O <= child2       * O<= child1       O<= child2
     * |             /                    *
     *  O<= child2 =>/                    *
     */
    it('ok, assign last child to new parent', (done) => {
      let subjId2;

      const myParent2 = u
      .getSubjectPrototype(`${tu.namePrefix}parent2`, null);
      Subject.create(myParent2)
      .then((created) => {
        subjId2 = created.id;
      })
      .then(() => Subject.findById(subjId1))
      .then(() => Subject.findById(childId1))
      .then((child1) => {
        expect(child1.get('absolutePath'))
        .to.equal(`${tu.namePrefix}parent1.${tu.namePrefix}child1`);
      })
      .then(() => Subject.findById(childId2))
      .then((child2) => {
        expect(child2.get('absolutePath'))
          .to.equal(`${tu.namePrefix}parent1.` +
            `${tu.namePrefix}child1.${tu.namePrefix}child2`);
        return child2.update({ parentId: subjId2 });
      })
      .then((child2) => {
        expect(child2.get('absolutePath'))
        .to.equal(`${tu.namePrefix}parent2.${tu.namePrefix}child2`);
        done();
      })
      .catch(done);
    });

    /*
     * Visual depiction below:
     * Before                            After
     * O<= root parent1 O<= new parent2  * O<= root parent1 O<= new parent2
     * |               /|                *                  |
     * O<= child1 ===>/ O<= child1       *                  O<= child1
     * |                |                *                  |
     * O<= child2       O<= child2       *                  O<= child2
     */
    it('ok, assign first child to new parent should include second child',
    (done) => {
      let subjId2;
      const myParent2 = u
      .getSubjectPrototype(`${tu.namePrefix}parent2`, null);

      Subject.create(myParent2)
      .then((p) => {
        subjId2 = p.id;
        return Subject.findById(childId1);
      })
      .then((child1) => {
        expect(child1.get('absolutePath'))
        .to.equal(`${tu.namePrefix}parent1.${tu.namePrefix}child1`);
        return child1.update({ parentId: subjId2 });
      })
      .then((updatedChild) => {
        expect(updatedChild.get('absolutePath'))
          .to.equal(`${tu.namePrefix}parent2.${tu.namePrefix}child1`);
      })
      .then(() => Subject.findById(childId1))
      .then((child1) => {
        setTimeout(() => {
          child1.getChildren()
          .each((c) => {
            expect(c.get('absolutePath'))
            .to.equal(`${tu.namePrefix}parent2.` +
              `${tu.namePrefix}child1.` +
              `${tu.namePrefix}child2`);
          })
          .catch(done);
          done();
        }, 500);
      })
      .catch(done);
    });
  });
});

describe('db: subject: update: isWritableBy: ', () => {
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

  it('subject is write-protected, isWritableBy false', (done) => {
    subjProtected.isWritableBy(user2.name)
    .then((isWritableBy) => {
      expect(isWritableBy).to.be.false;
      done();
    })
    .catch(done);
  });
}); // db: aspect: update: permission:
