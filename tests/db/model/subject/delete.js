/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/subject/delete.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const Aspect = tu.db.Aspect;
const Sample = tu.Sample;
const redisOps = require('../../../../cache/redisOps');

describe('tests/db/model/subject/delete.js >', () => {
  describe('no children >', () => {
    let id = 0;

    beforeEach((done) => {
      Subject.create({ name: `${tu.namePrefix}1` })
      .then((created) => {
        id = created.id;
        done();
      })
      .catch(done);
    });

    afterEach(u.forceDelete);

    it('ok', (done) => {
      Subject.findByPk(id)
      .then((s) => s.destroy())
      .then(() => Subject.findByPk(id))
      .then((s) => {
        expect(s).to.be.equal(null);
        done();
      })
      .catch(done);
    });
  });

  describe('with children >', () => {
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
      .catch(done);
    });

    afterEach(u.forceDelete);

    it('should fail, destroy parent', (done) => {
      Subject.findByPk(grandparent)
      .then((s) => s.destroy())
      .then(() => done('Uh oh. This should have thrown an error!'))
      .catch((err) => {
        expect(err).to.have.property('name')
        .to.equal('SubjectDeleteConstraintError');
        expect(err).to.have.property('subject');
        done();
      });
    });
  });

  describe('with children >', () => {
    let grandParent;
    let theParent;
    let childId1;
    let childId2;
    let otherParent;

    beforeEach((done) => {
      const myParent1 = u.getSubjectPrototype(`${tu.namePrefix}parent1`, null);
      Subject.create(myParent1)
      .then((created1) => {
        grandParent = created1.id;
      })
      .then(() => {
        const myParent2 = u
          .getSubjectPrototype(`${tu.namePrefix}parent2`, grandParent);
        return Subject.create(myParent2);
      })
      .then((created1) => {
        theParent = created1.id;
        const myChild1 = u
          .getSubjectPrototype(`${tu.namePrefix}child1`, theParent);
        return Subject.create(myChild1);
      })
      .then((c1) => {
        childId1 = c1.id;
      })
      .then(() => {
        const myChild2 =
          u.getSubjectPrototype(`${tu.namePrefix}child2`, childId1);
        return Subject.create(myChild2);
      })
      .then((c2) => {
        childId2 = c2.id;
        return Subject.create(
          u.getSubjectPrototype(`${tu.namePrefix}OtherParent`, null));
      })
      .then((op) => {
        otherParent = op;
        done();
      })
      .catch(done);
    });

    afterEach(u.forceDelete);

    it('clear description field on parent, should succeed', (done) => {
      Subject.findByPk(theParent)
      .then((parent1) => {
        const oldDescription = parent1.dataValues.description;
        expect(parent1.dataValues.description).to.equal(oldDescription);
        return parent1.update({ description: null });
      })
      .then((parent1) => {
        // console.log(parent1.dataValues.description);
        expect(parent1.dataValues.description).to.equal(null);
        done();
      })
      .catch(done);
    });

    it('clear helpEmail field on parent, should succeed', (done) => {
      Subject.findByPk(theParent)
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
      .catch(done);
    });

    it('clear helpUrl field on parent, should succeed', (done) => {
      Subject.findByPk(theParent)
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
      .catch(done);
    });

    it('clear imageUrl field on parent, should succeed', (done) => {
      Subject.findByPk(theParent)
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
      .catch(done);
    });

    it('clear isPublished field on parent, should fail', (done) => {
      Subject.findByPk(theParent)
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
      Subject.findByPk(theParent)
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
      Subject.findByPk(theParent)
      .then((parent1) => {
        const parentName = parent1.dataValues.name;
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
      Subject.findByPk(theParent)
      .then((parent1) => {
        expect(parent1.dataValues.childCount).to.equal(1);
      })
      .then(() => Subject.findByPk(childId1))
      .then((child1) => child1.update({ parentId: null }))
      .then(() => Subject.findByPk(theParent))
      .then((parent1) => {
        expect(parent1.dataValues.childCount).to.equal(0);
        done();
      })
      .catch(done);
    });

    it('reparent subject: child count on new parent should' +
        'increment', (done) => {
      Subject.findByPk(otherParent.id)
      .then((op) => {
        // check the old child Count
        expect(op.dataValues.childCount).to.equal(0);
      });
      Subject.findByPk(theParent)
      .then((sub) => sub.update({ parentId: otherParent.id }))
      .then(() => Subject.findByPk(otherParent.id))
      .then((op) => {
        // check the new child count again
        expect(op.dataValues.childCount).to.equal(1);
        done();
      })
      .catch(done);
    });

    it('reparent subject: child count on old parent should' +
       'decrement', (done) => {
      Subject.findByPk(grandParent)
      .then((gp) => {
        // check the old child Count
        expect(gp.dataValues.childCount).to.equal(1);
      });
      Subject.findByPk(theParent)
      .then((sub) => sub.update({ parentId: otherParent.id }))
      .then(() => Subject.findByPk(grandParent))
      .then((gp) => {
        // check the new child count again
        expect(gp.dataValues.childCount).to.equal(0);
        done();
      })
      .catch(done);
    });

    it('set child1 parentId to null, shouldnt affect child2', (done) => {
      Subject.findByPk(childId1)
      .then((child1) => {
        const child1ParentId = child1.dataValues.parentId;
        expect(child1.dataValues.parentId).to.equal(child1ParentId);
        return child1.update({ parentId: null });
      })
      .then((child1) => {
        expect(child1.dataValues.parentId).to.equal(null);
      })
      .then(() => Subject.findByPk(childId2))
      .then((child2) => {
        expect(child2.dataValues.parentId).to.equal(childId1);
        done();
      })
      .catch(done);
    });
  });

  describe('cascade delete samples >', () => {
    let sample;
    let subject;

    const aspectToCreate = {
      isPublished: true,
      name: `${tu.namePrefix}Aspect`,
      timeout: '30s',
      valueType: 'NUMERIC',
    };

    const subjectToCreate = {
      isPublished: true,
      name: `${tu.namePrefix}Subject`,
    };

    before((done) => {
      let aId;
      Aspect.create(aspectToCreate)
      .then((asp) => {
        aId = asp.id;
        return Subject.create(subjectToCreate);
      })
      .then((subj) => {
        subject = subj;
        return Sample.create({
          aspectId: aId,
          subjectId: subject.id,
        });
      })
      .then((samp) => {
        sample = samp;
        done();
      })
      .catch(done);
    });

    before(u.populateRedis);
    after(u.forceDelete);

    it('samples deleted when subject is deleted', (done) => {
      // asp-to-subj map will have one element
      redisOps.executeCommand(redisOps.getAspSubjMapMembers(aspectToCreate.name))
      .then((res) => {
        expect(res).to.deep.equal(['___subject']);
      }).then(() => redisOps.executeCommand(redisOps.getSubjAspMapMembers(subject.absolutePath)))
      .then((res) => {
        // subj-to-asp map will have one element
        expect(res).to.deep.equal(['___aspect']);
        return Subject.findByPk(subject.id);
      })
      .then((subj) => subj.destroy())
      .then(() => Sample.findOne(sample))
      .then((samp) => {
        expect(samp).to.equal(null);
        return redisOps.executeCommand(redisOps.getAspSubjMapMembers(aspectToCreate.name));
      })
      .then((res) => {
        // asp-to-subj map should be empty now
        expect(res).to.be.empty;
        return redisOps.executeCommand(redisOps.getSubjAspMapMembers(subject.absolutePath));
      }).then((res) => {
        // subj-to-asp map should be empty now
        expect(res).to.be.empty;
        done();
      })
      .catch(done);
    });
  });
});
