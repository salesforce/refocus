/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/subject/updateParent.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;

describe('tests/db/model/subject/updateParent.js >', () => {
  let subjId1;
  let childId1;
  let child1AbsolutePath;
  let child1Name;
  let childId2;
  let rootId;
  const ROOT_NAME = `${tu.namePrefix}parent0`;

  beforeEach((done) => {
    const _root = u
    .getSubjectPrototype(ROOT_NAME, null);
    Subject.create(_root)
    .then((root) => {
      rootId = root.id;
      const myParent1 = u
      .getSubjectPrototype(`${tu.namePrefix}parent1`, null);
      return Subject.create(myParent1);
    })
    .then((created1) => {
      subjId1 = created1.id;
      const myChild1 = u
      .getSubjectPrototype(`${tu.namePrefix}child1`, subjId1);
      return Subject.create(myChild1);
    })
    .then((c1) => {
      childId1 = c1.id;
      child1AbsolutePath = c1.absolutePath;
      child1Name = c1.name;
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
  after(u.forceDelete);

  it('on un-publishing subject, ' +
    'subject is not re-parented', (done) => {
    Subject.findByPk(childId2)
    .then((child) => child.update({ isPublished: false }))
    .then((updatedChild) => {
      expect(updatedChild.dataValues.parentId).to.equal(childId1);
      expect(updatedChild.dataValues.parentAbsolutePath).to.equal(child1AbsolutePath);
      done();
    })
    .catch(done);
  });

  it('on un-publishing subject and updating its name to same name, ' +
    'subject is not re-parented', (done) => {
    Subject.findByPk(childId2)
    .then((child) => child.update({ isPublished: false, name: child1Name }))
    .then((updatedChild) => {
      expect(updatedChild.dataValues.parentId).to.equal(childId1);
      expect(updatedChild.dataValues.parentAbsolutePath).to.equal(child1AbsolutePath);
      done();
    })
    .catch(done);
  });

  it('on un-publishing subject and changing its name, ' +
    'subject is not re-parented', (done) => {
    Subject.findByPk(childId2)
    .then((child) => child.update({ isPublished: false, name: ROOT_NAME }))
    .then((updatedChild) => {
      expect(updatedChild.dataValues.parentId).to.equal(childId1);
      expect(updatedChild.dataValues.parentAbsolutePath).to.equal(child1AbsolutePath);
      done();
    })
    .catch(done);
  });

  it('on update parentId to itself, ' +
    'the update fails', (done) => {
    Subject.findByPk(childId2)
    .then((child) => child.update({ parentId: childId2 }))
    .then((updatedChild) => done('Expected IllegalSelfParenting error. But ' +
      'received' + JSON.stringify(updatedChild)))
    .catch((err) => {
      expect(err.status).to.equal(400);
      expect(err.name).to.equal('IllegalSelfParenting');
      done();
    });
  });

  it('on update parentAbsolutePath to itself, ' +
    'the update fails', (done) => {
    Subject.findByPk(childId2)
    .then((child) => child.update({ parentAbsolutePath: child.absolutePath }))
    .then((updatedChild) => done('Expected IllegalSelfParenting error. But ' +
      'received' + JSON.stringify(updatedChild)))
    .catch((err) => {
      expect(err.status).to.equal(400);
      expect(err.name).to.equal('IllegalSelfParenting');
      done();
    });
  });

  it('on update parentAbsolutePath and parentId to empty and non-empty parent' +
    ' subjects, the empty field is set to match the other one', (done) => {
    Subject.findByPk(childId2)
    .then((child) => child.update({ parentAbsolutePath: ROOT_NAME, parentId: null }))
    .then((updatedChild) => {
      expect(updatedChild.parentAbsolutePath).to.equal(ROOT_NAME);
      expect(updatedChild.parentId).to.equal(rootId);
      done();
    })
    .catch(done);
  });

  it('on update parentAbsolutePath and parentId to different parent subjects, ' +
    'the update fails', (done) => {
    Subject.findByPk(childId2)
    .then((child) => child.update({ parentAbsolutePath: ROOT_NAME, parentId: subjId1 }))
    .then((updatedChild) => done('Expected ParentSubjectNotMatch error. But received' +
      JSON.stringify(updatedChild)))
    .catch((err) => {
      expect(err.status).to.equal(400);
      expect(err.name).to.equal('ParentSubjectNotMatch');
      done();
    });
  });

  it('on update parentAbsolutePath or parentId to a non-existent subject, ' +
    'the update fails', (done) => {
    Subject.findByPk(childId2)
    .then((child) => child.update({ parentAbsolutePath: 'notHere', parentId: subjId1 }))
    .then((updatedChild) => done('Expected ParentSubjectNotFound error. But received' +
      JSON.stringify(updatedChild)))
    .catch((err) => {
      expect(err.status).to.equal(400);
      expect(err.name).to.equal('ParentSubjectNotFound');
      done();
    });
  });

  it('on update parentAbsolutePath to null, child becomes root', (done) => {
    Subject.findByPk(childId2)
    .then((child) => child.update({ parentAbsolutePath: null }))
    .then((updatedChild) => {
      expect(updatedChild.dataValues.parentAbsolutePath).to.be.null;
      expect(updatedChild.dataValues.parentId).to.be.null;
      done();
    })
    .catch(done);
  });

  it('on update parentAbsolutePath to "", child becomes root', (done) => {
    Subject.findByPk(childId2)
    .then((child) => child.update({ parentAbsolutePath: '' }))
    .then((updatedChild) => {
      expect(updatedChild.dataValues.parentAbsolutePath).to.equal(null);
      expect(updatedChild.dataValues.parentId).to.be.null;
      done();
    })
    .catch(done);
  });

  it('on update parentId to null, child becomes root', (done) => {
    Subject.findByPk(childId2)
    .then((child) => child.update({ parentId: null }))
    .then((updatedChild) => {
      expect(updatedChild.dataValues.parentAbsolutePath).to.be.null;
      expect(updatedChild.dataValues.parentId).to.be.null;
      done();
    })
    .catch(done);
  });

  it('on update child name, child should remain parented', (done) => {
    const childName = 'achoo';
    let oldParentId = null;
    let oldParentAbsolutePath = null;
    Subject.findByPk(childId2)
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
    .then(() => Subject.findByPk(childId1))
    .then((child) => {
      oldParentId = child.parentId;
      return child.update({ parentAbsolutePath: parentName });
    })
    .then(() => Subject.findByPk(oldParentId))
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
    .then(() => Subject.findByPk(childId1))
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
    .then(() => Subject.findByPk(childId2))
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
    .then(() => Subject.findByPk(childId2))
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
    Subject.findByPk(subjId1)
    .then((parent) => parent.update({ name: `${parent.get('name')}_UP` }))
    .then(() => {
      setTimeout(() => {
        Subject.findByPk(childId1)
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

  it('update parent helpEmail, should not change child subject', (done) => {
    Subject.findByPk(subjId1)
    .then((parent) => {
      expect(parent.get('helpEmail')).to.equal('foo@bar.com');
      parent.update({ helpEmail: 'foobaz@bar.com' });
      expect(parent.get('helpEmail')).to.equal('foobaz@bar.com');
    })
    .then(() => Subject.findByPk(childId1))
    .then((child) => {
      expect(child.get('helpEmail')).to.equal('foo@bar.com');
      done();
    })
    .catch(done);
  });

  it('update parent helpUrl, should not change child subject', (done) => {
    Subject.findByPk(subjId1)
    .then((parent) => {
      expect(parent.get('helpUrl')).to.equal('http://www.bar.com');
      parent.update({ helpUrl: 'http://www.foobar.com' });
      expect(parent.get('helpUrl')).to.equal('http://www.foobar.com');
    })
    .then(() => Subject.findByPk(childId1))
    .then((child) => {
      expect(child.get('helpUrl')).to.equal('http://www.bar.com');
      done();
    })
    .catch(done);
  });

  it('update parent imageUrl, should not change child subject', (done) => {
    Subject.findByPk(subjId1)
    .then((parent) => {
      expect(parent.get('imageUrl'))
      .to.equal('http://www.bar.com/foo.jpg');
      parent.update({ imageUrl: 'http://www.zoobar.com/foo.jpg' });
      expect(parent.get('imageUrl'))
      .to.equal('http://www.zoobar.com/foo.jpg');
    })
    .then(() => Subject.findByPk(childId1))
    .then((child) => {
      expect(child.get('imageUrl'))
      .to.equal('http://www.bar.com/foo.jpg');
      done();
    })
    .catch(done);
  });

  /**
   * Previously p1._c1
   * Re-parent to _p2._p1._c1
   */
  it('ok, child absolutePath is updated with new parent and old parent',
  (done) => {
    let subjId2;
    const myParent2 = u.getSubjectPrototype(`${tu.namePrefix}parent2`, null);
    Subject.create(myParent2)
    .then((created) => {
      subjId2 = created.id;
    })
    .then(() => Subject.findByPk(subjId1))
    .then((parent1) => parent1.update({ parentId: subjId2 }))
    .then(() => {
      setTimeout(() => {
        Subject.findByPk(childId1)
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
    .then(() => Subject.findByPk(subjId1))
    .then(() => Subject.findByPk(childId1))
    .then((child1) => {
      expect(child1.get('absolutePath'))
      .to.equal(`${tu.namePrefix}parent1.${tu.namePrefix}child1`);
    })
    .then(() => Subject.findByPk(childId2))
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
      return Subject.findByPk(childId1);
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
    .then(() => Subject.findByPk(childId1))
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

  /*
   * Visual depiction below:
   * O<= parent1 O <= parent2
   * |               /|
   * O<= child1 ===>/ O<= child1
   * |
   * O<= child2
   */
  it('error, assign first child to new parent with existing child', (done) => {
    let subjId2;
    const myParent2 = u.getSubjectPrototype(`${tu.namePrefix}parent2`, null);
    Subject.create(myParent2)
    .then((created) => {
      subjId2 = created.id;
      const myChild1 = u.getSubjectPrototype(`${tu.namePrefix}child1`, subjId2);
      return Subject.create(myChild1);
    })
    .then(() => Subject.findByPk(childId1))
    .then((child1) => {
      expect(child1.get('absolutePath'))
      .to.equal(`${tu.namePrefix}parent1.${tu.namePrefix}child1`);
      return child1.update({ parentId: subjId2 });
    })
    .then((child1) => {
      done('Expected SubjectAlreadyExistsUnderParent error. But received' +
        JSON.stringify(child1));
    })
    .catch((err) => {
      expect(err.status).to.equal(400);
      expect(err.name).to.equal('SubjectAlreadyExistsUnderParent');
      done();
    })
    .catch(done);
  });

  /*
   * Visual depiction below:
   * O<= parent1 O <= parent2
   * |               /|
   * O<= child1     / O<= child2
   * |             /
   * O<= child2   /
   */
  it('error, assign last child to new parent with existing child', (done) => {
    let subjId2;
    const myParent2 = u.getSubjectPrototype(`${tu.namePrefix}parent2`, null);
    Subject.create(myParent2)
    .then((created) => {
      subjId2 = created.id;
      const myChild2 = u.getSubjectPrototype(`${tu.namePrefix}child2`, subjId2);
      return Subject.create(myChild2);
    })
    .then(() => Subject.findByPk(childId2))
    .then((child2) => {
      expect(child2.get('absolutePath'))
      .to.equal(`${tu.namePrefix}parent1.${tu.namePrefix}child1.` +
        `${tu.namePrefix}child2`);
      return child2.update({ parentId: subjId2 });
    })
    .then((child1) => {
      done('Expected SubjectAlreadyExistsUnderParent error. But received' +
        JSON.stringify(child1));
    })
    .catch((err) => {
      expect(err.status).to.equal(400);
      expect(err.name).to.equal('SubjectAlreadyExistsUnderParent');
      done();
    })
    .catch(done);
  });

  /*
   * Visual depiction below:
   * O<= parent1 O <= parent2
   * |               /|
   * O<= child1     / O<= child1
   * |             /  |
   * O<= child2   /   O<= child2
   */
  it('ok, assign child to new parent with existing child in the hierarchy',
    (done) => {
    let subjId2;
    const myParent2 = u.getSubjectPrototype(`${tu.namePrefix}parent2`, null);
    Subject.create(myParent2)
    .then((created) => {
      subjId2 = created.id;
      const myChild1 = u.getSubjectPrototype(`${tu.namePrefix}child1`, subjId2);
      return Subject.create(myChild1);
    })
    .then((created) => {
      const myChild2 = u.getSubjectPrototype(`${tu.namePrefix}child2`, created.id);
      return Subject.create(myChild2);
    })
    .then(() => Subject.findByPk(childId2))
    .then((child2) => {
      expect(child2.get('absolutePath'))
      .to.equal(`${tu.namePrefix}parent1.${tu.namePrefix}child1.` +
        `${tu.namePrefix}child2`);
      return child2.update({ parentId: subjId2 });
    })
    .then((updatedChild) => {
      expect(updatedChild.get('absolutePath'))
      .to.equal(`${tu.namePrefix}parent2.${tu.namePrefix}child2`);
      done();
    })
    .catch(done);
  });
});
