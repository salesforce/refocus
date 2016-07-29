/**
 * tests/db/model/subject/delete.js
 */
'use strict';

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;

describe('db: subject: delete: ', () => {
  describe('no children: ', () => {
    let id = 0;

    beforeEach((done) => {
      Subject.create({ name: `${tu.namePrefix}1` })
      .then((created) => {
        id = created.id;
        done();
      })
      .catch((err) => done(err));
    });

    afterEach(u.forceDelete);

    it('ok', (done) => {
      Subject.findById(id)
      .then((s) => s.destroy())
      .then(() => Subject.findById(id))
      .then((s) => {
        expect(s).to.be.equal(null);
        done();
      })
      .catch((err) => done(err));
    });
  });

  describe('with children', () => {
    let grandparent;
    let parent;
    let child1;
    let child2;

    beforeEach((done) => {
      Subject.create({ name: `${tu.namePrefix}0`, isPublished: true, })
      .then((o) => {
        grandparent = o.id;
        return Subject.create({
          name: `${tu.namePrefix}1`,
          parentId: grandparent,
          isPublished: true,
        });
      })
      .then((o) => {
        parent = o.id;
        return Subject.create({
          name: `${tu.namePrefix}2a`,
          parentId: parent,
          isPublished: true,
        });
      })
      .then((o) => {
        child1 = o.id;
        return Subject.create({
          name: `${tu.namePrefix}2b`,
          parentId: parent,
          isPublished: true,
        });
      })
      .then((o) => {
        child2 = o.id;
        done();
      })
      .catch((err) => done(err));
    });

    afterEach(u.forceDelete);

    it('should fail, destroy parent', (done) => {
      Subject.findById(grandparent)
      .then((s) => s.destroy())
      .then(() => done('Uh oh. This should have thrown an error!'))
      .catch((err) => {
        expect(err).to.have.property('name')
        .to.equal('SubjectDeleteConstraintError');
        expect(err).to.have.property('subject');
        done();
      });
    });

    it('deleteHierarchy should succeed', (done) => {
      Subject.scope('hierarchy').findById(grandparent)
      .then((s) => s.deleteHierarchy())
      .then(() => Subject.findById(child1))
      .then((s) => expect(s).to.be.null)
      .then(() => Subject.findById(child2))
      .then((s) => expect(s).to.be.null)
      .then(() => Subject.findById(parent))
      .then((s) => expect(s).to.be.null)
      .then(() => Subject.findById(grandparent))
      .then((s) => expect(s).to.be.null)
      .then(() => done())
      .catch((err) => done(err));
    });
  });

  describe('with children', () => {
    let grandParent;
    let theParent;
    let childId1;
    let childId2;
    let otherParent;

    beforeEach((done) => {
      const myParent1 = u
      .getSubjectPrototype(`${tu.namePrefix}parent1`, null);
      Subject.create(myParent1)
      .then((created1) => {
        grandParent = created1.id;
      })
      .then(() => {
        const myParent2 = u
      .getSubjectPrototype(`${tu.namePrefix}parent2`, grandParent);
        Subject.create(myParent2)
      .then((created1) => {
        theParent = created1.id;
      })
      .then(() => {
        const myChild1 = u
        .getSubjectPrototype(`${tu.namePrefix}child1`, theParent);
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
        return Subject.create(u
        .getSubjectPrototype(`${tu.namePrefix}OtherParent`, null));
      })
      .then((op) =>{
        otherParent = op;
        done();
      })
      .catch((err) => {
        done(err);
      });
      });
    });
    afterEach(u.forceDelete);

    it('clear description field on parent, should succeed', (done) => {
      Subject.findById(theParent)
      .then((parent1) => {
        const oldDescription = parent1.dataValues.description;
        // console.log(parent1.dataValues.description);
        expect(parent1.dataValues.description).to.equal(oldDescription);
        return parent1.update({ description: null });
      })
      .then((parent1) => {
        // console.log(parent1.dataValues.description);
        expect(parent1.dataValues.description).to.equal(null);
        done();
      })
      .catch((err) => done(err));
    });

    it('clear helpEmail field on parent, should succeed', (done) => {
      Subject.findById(theParent)
      .then((parent1) => {
        // console.log(parent1.dataValues.helpEmail);
        expect(parent1.dataValues.helpEmail).to.equal('foo@bar.com');
        return parent1.update({ helpEmail: null });
      })
      .then((parent1) => {
        // console.log(parent1.dataValues.helpEmail);
        expect(parent1.dataValues.helpEmail).to.equal(null);
        done();
      })
      .catch((err) => done(err));
    });

    it('clear helpUrl field on parent, should succeed', (done) => {
      Subject.findById(theParent)
      .then((parent1) => {
        // console.log(parent1.dataValues.helpUrl);
        expect(parent1.dataValues.helpUrl)
        .to.equal('http://www.bar.com');
        return parent1.update({ helpUrl: null });
      })
      .then((parent1) => {
        // console.log(parent1.dataValues.helpUrl);
        expect(parent1.dataValues.helpUrl).to.equal(null);
        done();
      })
      .catch((err) => done(err));
    });

    it('clear imageUrl field on parent, should succeed', (done) => {
      Subject.findById(theParent)
      .then((parent1) => {
        // console.log(parent1.dataValues.imageUrl);
        expect(parent1.dataValues.imageUrl)
        .to.equal('http://www.bar.com/foo.jpg');
        return parent1.update({ imageUrl: null });
      })
      .then((parent1) => {
        // console.log(parent1.dataValues.imageUrl);
        expect(parent1.dataValues.imageUrl).to.equal(null);
        done();
      })
      .catch((err) => done(err));
    });

    it('clear isPublished field on parent, should fail', (done) => {
      Subject.findById(theParent)
      .then((parent1) => {
        // console.log(parent1.dataValues.isPublished);
        expect(parent1.dataValues.isPublished).to.equal(true);
        return parent1.update({ isPublished: null });
      })
      .then(() => done('Uh oh. This should have thrown an error!'))
      .catch((err) => {
        expect(err).to.have.property('name')
        .to.equal('SequelizeValidationError');
        done();
      });
    });

    it('clear isDeleted field on parent, should fail', (done) => {
      Subject.findById(theParent)
      .then((parent1) => {
        // console.log(parent1.dataValues.isDeleted);
        // Expecting a string 0 since sequelize treats BIGINT as an object
        expect(parent1.dataValues.isDeleted).to.equal('0');
        return parent1.update({ isDeleted: null });
      })
      .then(() => done('Uh oh. This should have thrown an error!'))
      .catch((err) => {
        // console.log(err);
        expect(err).to.have.property('name')
        .to.equal('SequelizeValidationError');
        done();
      });
    });

    it('clear name field on parent, should fail', (done) => {
      Subject.findById(theParent)
      .then((parent1) => {
        const parentName = parent1.dataValues.name;
        // console.log(parent1.dataValues.name);
        expect(parent1.dataValues.name).to.equal(parentName);
        return parent1.update({ name: null });
      })
      .then(() => done('Uh oh. This should have thrown an error!'))
      .catch((err) => {
        expect(err).to.have.property('name')
        .to.equal('SequelizeValidationError');
        done();
      });
    });

    it('clear child1 parentId, parent childCount should be 0', (done) => {
      Subject.findById(theParent)
      .then((parent1) => {
        // console.log(parent1.dataValues.childCount);
        // console.log(parent1.dataValues.id);
        expect(parent1.dataValues.childCount).to.equal(1);
      })
      .then(() => Subject.findById(childId1))
      .then((child1) => {
        // console.log(child1.dataValues.parentId);
        return child1.update({ parentId: null });
      })
      // .then((child1) => {
      // console.log(child1.dataValues.parentId);
      // })
      .then(() => {
        return Subject.findById(theParent);
      })
      .then((parent1) => {
        // console.log(parent1.dataValues.childCount);
        expect(parent1.dataValues.childCount).to.equal(0);
        done();
      })
      .catch((err) => done(err));
    });

    it('reparent subject: child count on new parent should' +
        'increment', (done) => {
      Subject.findById(otherParent.id)
      .then((op) => {
        // check the old child Count
        expect(op.dataValues.childCount).to.equal(0);
      });
      Subject.findById(theParent)
      .then((sub) => {
        return sub.update({ parentId: otherParent.id });
      })
      .then(() => {
        return Subject.findById(otherParent.id);
      })
      .then((op) => {
        // check the new child count again
        expect(op.dataValues.childCount).to.equal(1);
        done();
      })
      .catch((err) => done(err));
    });

    it('reparent subject: child count on old parent should' +
       'decrement', (done) => {
      Subject.findById(grandParent)
      .then((gp) => {
        // check the old child Count
        expect(gp.dataValues.childCount).to.equal(1);
      });
      Subject.findById(theParent)
      .then((sub) => {
        return sub.update({ parentId: otherParent.id });
      })
      .then(() => {
        return Subject.findById(grandParent);
      })
      .then((gp) => {
        // check the new child count again
        expect(gp.dataValues.childCount).to.equal(0);
        done();
      })
      .catch((err) => done(err));
    });

    it('set child1 parentId to null, shouldnt affect child2', (done) => {
      Subject.findById(childId1)
      .then((child1) => {
        const child1ParentId = child1.dataValues.parentId;
        // console.log(child1.dataValues.parentId);
        expect(child1.dataValues.parentId).to.equal(child1ParentId);
        return child1.update({ parentId: null });
      })
      .then((child1) => {
        // console.log(child1.dataValues.parentId);
        expect(child1.dataValues.parentId).to.equal(null);
      })
      .then(() => {
        return Subject.findById(childId2);
      })
      .then((child2) => {
        // console.log(child2.dataValues.parentId);
        expect(child2.dataValues.parentId).to.equal(childId1);
        done();
      })
      .catch((err) => done(err));
    });
  });
});
