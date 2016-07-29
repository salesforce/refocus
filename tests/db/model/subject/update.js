/**
 * tests/db/model/subject/update.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;

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
      .catch((err) => {
        done(err);
      });
    });

    afterEach(u.forceDelete);

    it('on update parentAbsolutePath to "", child becomes root', (done) => {
      const parentName = `${tu.namePrefix}parent6`;
      let oldParentId;
      Subject.create({ name: parentName })
      .then((parent) => {
        oldParentId = parent.id;
        return Subject.findById(childId1);
      })
      .then((child) => {
        return child.update({ parentAbsolutePath: parentName });
      })
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
      .catch((err) => {
        done(err);
      });
    });

    it('on update parentId to null, child becomes root', (done) => {
      const parentName = `${tu.namePrefix}parent7`;
      let childPath;
      let oldParentId;
      Subject.create({ name: parentName })
      .then((parent) => {
        oldParentId = parent.id;
        return Subject.findById(childId1);
      })
      .then((child) => {
        return child.update({ parentAbsolutePath: parentName });
      })
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
      .catch((err) => {
        done(err);
      });
    });

    it('on update child name, child should remain parented', (done) => {
      const childName = 'achoo';
      Subject.findById(childId1)
      .then((child) => {
        return child.update({ name: childName });
      })
      .then((child) => {
        expect(child.dataValues.parentAbsolutePath).to.not.be.null;
        expect(child.dataValues.absolutePath).to.contain('.');
        done();
      })
      .catch((err) => {
        done(err);
      });
    });

    it('on parentAbsolutePath change, childCount of old ' +
      'parent is decremented', (done) => {
      const parentName = `${tu.namePrefix}parent3`;
      let oldParentId = '';
      Subject.create({ name: parentName })
      .then(() => {
        return Subject.findById(childId1);
      })
      .then((child) => {
        oldParentId = child.parentId;
        return child.update({ parentAbsolutePath: parentName });
      })
      .then(() => {
        return Subject.findById(oldParentId);
      })
      .then((oldParent) => {
        expect(oldParent.dataValues.childCount).to.equal(0);
        done();
      })
      .catch((err) => {
        done(err);
      });
    });

    it('on parentAbsolutePath change, childCount of new ' +
      'parent is incremented', (done) => {
      const parentName = `${tu.namePrefix}parent3`;
      Subject.create({ name: parentName })
      .then(() => {
        return Subject.findById(childId1);
      })
      .then((child) => {
        return child.update({ parentAbsolutePath: parentName });
      })
      .then(() => {
        return Subject.findOne({ where: { name: parentName } });
      })
      .then((parent) => {
        expect(parent.dataValues.childCount).to.equal(1);
        done();
      })
      .catch((err) => {
        done(err);
      });
    });

    it('on parentAbsolutePath change, child"s parentAbsolutePath' +
      'and absolutePath is changed', (done) => {
      const parentName = `${tu.namePrefix}parent3`;
      Subject.create({ name: parentName })
      .then(() => {
        return Subject.findById(childId1);
      })
      .then((child) => {
        return child.update({ parentAbsolutePath: parentName });
      })
      .then((child) => {
        expect(child.dataValues.absolutePath).to
        .equal(`${parentName}.${tu.namePrefix}child1`);
        expect(child.dataValues.parentAbsolutePath).to.equal(parentName);
        done();
      })
      .catch((err) => {
        done(err);
      });
    });

    it('on parentAbsolutePath change, ' +
      'child"s absolutePath is updated', (done) => {
      const parentName = `${tu.namePrefix}parent2`;
      Subject.create({ name: parentName })
      .then(() => {
        return Subject.findById(childId1);
      })
      .then((subj) => {
        return subj.update({ parentAbsolutePath: parentName });
      })
      .then((subj) => {
        expect(subj.dataValues.parentAbsolutePath).to.equal(parentName);
        expect(subj.dataValues.absolutePath).to
        .equal(`${tu.namePrefix}parent2.${tu.namePrefix}child1`);
        done();
      })
      .catch((err) => {
        done(err);
      });
    });

    it('ok, child absolutePath is updated when parent name is updated',
    (done) => {
      Subject.findById(subjId1)
      .then((parent) => {
        return parent.update({ name: `${parent.get('name')}_UP` });
      })
      .then(() => {
        setTimeout(() => {
          Subject.findById(childId1)
          .then((child) => {
            expect(child.get('absolutePath'))
            .to.equal(`${tu.namePrefix}parent1_UP.${tu.namePrefix}child1`);
            done();
          })
          .catch((err) => done(err));
        }, 500);
      })
      .catch((err) => done(err));
    });

    it('update parent helpEmail, should not change child subject',
    (done) => {
      Subject.findById(subjId1)
      .then((parent) => {
        expect(parent.get('helpEmail')).to.equal('foo@bar.com');
        parent.update({ helpEmail: 'foobaz@bar.com' });
        expect(parent.get('helpEmail')).to.equal('foobaz@bar.com');
      })
      .then(() => {
        return Subject.findById(childId1);
      })
      .then((child) => {
        expect(child.get('helpEmail')).to.equal('foo@bar.com');
        done();
      })
      .catch((err) => done(err));
    });

    it('update parent helpUrl, should not change child subject',
    (done) => {
      Subject.findById(subjId1)
      .then((parent) => {
        expect(parent.get('helpUrl')).to.equal('http://www.bar.com');
        parent.update({ helpUrl: 'http://www.foobar.com' });
        expect(parent.get('helpUrl')).to.equal('http://www.foobar.com');
      })
      .then(() => {
        return Subject.findById(childId1);
      })
      .then((child) => {
        expect(child.get('helpUrl')).to.equal('http://www.bar.com');
        done();
      })
      .catch((err) => done(err));
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
      .then(() => {
        return Subject.findById(childId1);
      })
      .then((child) => {
        expect(child.get('imageUrl'))
        .to.equal('http://www.bar.com/foo.jpg');
        done();
      })
      .catch((err) => done(err));
    });

    it('update parent isPublished to false, should not change child subject',
    (done) => {
      Subject.findById(subjId1)
      .then((parent) => {
        expect(parent.get('isPublished')).to.equal(true);
        parent.update({ isPublished: false });
        expect(parent.get('isPublished')).to.equal(false);
      })
      .then(() => {
        return Subject.findById(childId1);
      })
      .then((child) => {
        expect(child.get('isPublished')).to.equal(true);
        done();
      })
      .catch((err) => done(err));
    });

    it('update child helpEmail, should not change parent subject',
    (done) => {
      Subject.findById(childId1)
      .then((child) => {
        expect(child.get('helpEmail')).to.equal('foo@bar.com');
        child.update({ helpEmail: 'foobaz@bar.com' });
        expect(child.get('helpEmail')).to.equal('foobaz@bar.com');
      })
      .then(() => {
        return Subject.findById(subjId1);
      })
      .then((parent) => {
        expect(parent.get('helpEmail')).to.equal('foo@bar.com');
        done();
      })
      .catch((err) => done(err));
    });

    it('update child helpUrl, should not change parent subject',
    (done) => {
      Subject.findById(childId1)
      .then((child) => {
        expect(child.get('helpUrl')).to.equal('http://www.bar.com');
        child.update({ helpUrl: 'http://www.foobar.com' });
        expect(child.get('helpUrl')).to.equal('http://www.foobar.com');
      })
      .then(() => {
        return Subject.findById(subjId1);
      })
      .then((parent) => {
        expect(parent.get('helpUrl')).to.equal('http://www.bar.com');
        done();
      })
      .catch((err) => done(err));
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
      .then(() => {
        return Subject.findById(subjId1);
      })
      .then((parent) => {
        expect(parent.get('imageUrl'))
        .to.equal('http://www.bar.com/foo.jpg');
        done();
      })
      .catch((err) => done(err));
    });

    it('update child isPublished, should not change parent subject',
    (done) => {
      Subject.findById(childId1)
      .then((child) => {
        expect(child.get('isPublished')).to.equal(true);
        child.update({ isPublished: false });
        expect(child.get('isPublished')).to.equal(false);
      })
      .then(() => {
        return Subject.findById(subjId1);
      })
      .then((parent) => {
        expect(parent.get('isPublished')).to.equal(true);
        done();
      })
      .catch((err) => done(err));
    });

    it('ok, child absolutePath is updated with new parent and old parent',
    (done) => {
      let subjId2;

      const myParent2 = u
      .getSubjectPrototype(`${tu.namePrefix}parent2`, null);
      Subject.create(myParent2)
      .then((created) => {
        subjId2 = created.id;
      })
      .then(() => {
        return Subject.findById(subjId1);
      })
      .then((parent1) => {
        return parent1.update({ parentId: subjId2 });
      })
      .then(() => {
        setTimeout(() => {
          Subject.findById(childId1)
          .then((child) => {
            expect(child.get('absolutePath'))
            .to.equal(`${tu.namePrefix}parent2.`+
                      `${tu.namePrefix}parent1.`+
                      `${tu.namePrefix}child1`);
            done();
          })
          .catch((err) => done(err));
        }, 500);
      })
      .catch((err) => done(err));
    });

    it('ok, assign last child to new parent',
      // Visual depiction below:
      // Before                             // After
      // O<= root parent1 O <= new parent2 * O<= root parent1 O<= new parent2
      // |               /|                * |                |
      // O<= child1     / O <= child2      * O<= child1       O<= child2
      // |             /                   *
      // O<= child2 =>/                    *
    (done) => {
      let subjId2;

      const myParent2 = u
      .getSubjectPrototype(`${tu.namePrefix}parent2`, null);
      Subject.create(myParent2)
      .then((created) => {
        subjId2 = created.id;
      })
      .then(() => {
        return Subject.findById(subjId1);
      })
      .then(() => {
        return Subject.findById(childId1);
      })
      .then((child1) => {
        expect(child1.get('absolutePath'))
        .to.equal(`${tu.namePrefix}parent1.${tu.namePrefix}child1`);
      })
      .then(() => {
        return Subject.findById(childId2);
      })
      .then((child2) => {
        expect(child2.get('absolutePath'))
        .to.equal(`${tu.namePrefix}parent1.`+
                  `${tu.namePrefix}child1.`+
                  `${tu.namePrefix}child2`);
        return child2.update({ parentId: subjId2 });
      })
      .then((child2) => {
        expect(child2.get('absolutePath'))
        .to.equal(`${tu.namePrefix}parent2.${tu.namePrefix}child2`);
        done();
      })
      .catch((err) => done(err));
    });

    it('ok, assign first child to new parent should include second child',
      // Visual depiction below:
      // Before                           // After
      // O<= root parent1 O<= new parent2 * O<= root parent1 O<= new parent2
      // |               /|               *                  |
      // O<= child1 ===>/ O<= child1      *                  O<= child1
      // |                |               *                  |
      // O<= child2       O<= child2      *                  O<= child2
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
        // return updatedChild.getChildren();
      })
      .then(() => {
        return Subject.findById(childId1);
      })
      .then((child1) => {
        setTimeout(() => {
          child1.getChildren()
          .each((c) => {
            expect(c.get('absolutePath'))
            .to.equal(`${tu.namePrefix}parent2.`+
                  `${tu.namePrefix}child1.` +
                  `${tu.namePrefix}child2`);
          })
          .catch((err) => done(err));
          done();
        }, 500);
      })
      .catch((err) => done(err));
    });
  });
});
