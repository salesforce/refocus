/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/subject/hierarchy.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Subject = tu.db.Subject;
const sequelize = tu.db.sequelize;

describe('tests/db/model/subject/rebuildHierarchy.js >', () => {
  const trueParent = { name: `${tu.namePrefix}trueParent`, isPublished: true };
  const fakeParent = { name: `${tu.namePrefix}fakeParent`, isPublished: true };
  const child = { name: `${tu.namePrefix}child`, isPublished: true };
  let ipar = 0;
  let fakeParentId = 0;
  let childId = 0;

  before((done) => {
    Subject.create(trueParent)
    .then((subj) => {
      ipar = subj.id;
    })
    .then(() => {
      child.parentId = ipar;
      return Subject.create(child);
    })
    .then((subj) => {
      childId = subj.id;
      return Subject.create(fakeParent);
    })
    .then((subj) => {
      fakeParentId = subj.id;
      done();
    })
    .catch(done);
  });

  it('Rebuild Hierarchy', (done) => {
    const query = `UPDATE "Subjectsancestors" SET "ancestorId"=` +
      `'${fakeParentId}' WHERE "SubjectId"='${childId}'`;

    const getQuery = `SELECT "ancestorId" FROM "Subjectsancestors" ` +
      `WHERE "SubjectId"='${childId}'`;

    sequelize.query(query)
    .then((res) => {
      sequelize.query(getQuery)
      .then((res) => {
        expect(res[0][0].ancestorId).to.equal(fakeParentId);
        Subject.rebuildHierarchy()
        .then(() => {
          Subject.findByPk(childId)
          .then((subj) => {
            expect(subj.parentId).to.equal(ipar);

            return done();
          });
        });
      });
    });
  });

  after(u.forceDelete);
});

describe('tests/db/model/subject/hierarchy.js >', () => {
  const parTag = ['___na', '___continent'];
  const grnTag = ['___qbc', '___state'];
  const parLink = [{ name: '____parlink', url: 'https://fakelink.com' }];
  const grnLink = [{ name: '____grnlink', url: 'https://fakelink.com' }];
  const par = {
    name: `${tu.namePrefix}NorthAmerica`,
    isPublished: true,
    tags: parTag,
    relatedLinks: parLink,
  };
  const chi = { name: `${tu.namePrefix}Canada`, isPublished: true };
  const grn = {
    name: `${tu.namePrefix}Quebec`,
    isPublished: true,
    tags: grnTag,
    relatedLinks: grnLink,
  };
  let ipar = 0;
  let ichi = 0;
  before((done) => {
    Subject.create(par)
    .then((subj) => {
      ipar = subj.id;
    })
    .then(() => {
      chi.parentId = ipar;
      return Subject.create(chi);
    })
    .then((subj) => {
      ichi = subj.id;
      grn.parentId = ichi;
      return Subject.create(grn);
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);

  describe('with tags and related links >', () => {
    it('at all levels of hierarchy', (done) => {
      Subject.scope('hierarchy').findByPk(ipar)
      .then((sub) => {
        const parent = sub.get({ plain: true });
        expect(parent.tags).to.have.length(parTag.length);
        expect(parent.relatedLinks).to.have.length(parLink.length);
        expect(parent.children[0].tags).to.have.length(0);
        expect(parent.children[0].relatedLinks).to.have.length(0);

        expect(parent.children[0].children[0].tags).to.have
          .length(grnTag.length);
        expect(parent.children[0].children[0].relatedLinks).to.have
          .length(grnLink.length);
      })
      .then(() => done())
      .catch(done);
    });

    it('no tags and relatedlinks at child level', (done) => {
      Subject.scope('hierarchy').findByPk(ichi)
      .then((sub) => {
        expect(sub.tags).to.have.length(0);
        expect(sub.relatedLinks).to.have.length(0);
      })
      .then(() => done())
      .catch(done);
    });

    it('parentAbsolutePath is null at root level', (done) => {
      Subject.scope('hierarchy').findByPk(ipar)
      .then((sub) => {
        expect(sub.dataValues.parentAbsolutePath).to.equal.null;
        done();
      })
      .catch(done);
    });

    it('parentAbsolutePath is non-null at child level', (done) => {
      Subject.scope('hierarchy').findByPk(ichi)
      .then((sub) => {
        expect(sub.dataValues.parentAbsolutePath).to.equal(par.name);
        done();
      })
      .catch(done);
    });

    it('present at the grand child level', (done) => {
      Subject.scope('hierarchy').findByPk(ipar)
      .then((sub) => {
        expect(sub.tags).to.have.length(grnTag.length);
        expect(sub.relatedLinks).to.have.length(grnLink.length);
      })
      .then(() => done())
      .catch(done);
    });
  });

  it('entire hierarchy', (done) => {
    Subject.findAll({ hierarchy: true })
    .then((o) => {
      const gp = o[0].get({ plain: true });
      expect(gp.children).to.have.length(1);
      expect(gp.childCount).to.equal(1);
      const pa = gp.children[0].get();
      expect(pa.children).to.have.length(1);
      expect(pa.childCount).to.equal(1);
      const ch = pa.children[0].get();
      expect(ch.parentAbsolutePath).to.equal(pa.absolutePath);
      expect(ch.childCount).to.equal(0);
      expect(ch).to.not.have.property('children');
      done();
    })
    .catch(done);
  });

  it('explicitly include descendents', (done) => {
    Subject.findOne({
      where: { id: ipar },
      include: [
        {
          model: Subject,
          as: 'descendents',
          hierarchy: true,
        },
      ],
    })
    .then((o) => {
      const gp = o.get({ plain: true });
      expect(gp.children).to.have.length(1);
      expect(gp.childCount).to.equal(1);
      const pa = gp.children[0].get();
      expect(pa.children).to.have.length(1);
      expect(pa.childCount).to.equal(1);
      const ch = pa.children[0].get();
      expect(ch.parentAbsolutePath).to.equal(pa.absolutePath);
      expect(ch.childCount).to.equal(0);
      expect(ch).to.not.have.property('children');
      done();
    })
    .catch(done);
  });

  it('using "hierarchy" scope', (done) => {
    Subject.scope('hierarchy').findByPk(ipar)
    .then((o) => {
      const gp = o.get({ plain: true });
      expect(gp.children).to.have.length(1);
      expect(gp.childCount).to.equal(1);
      const pa = gp.children[0].get();
      expect(pa.children).to.have.length(1);
      expect(pa.childCount).to.equal(1);
      const ch = pa.children[0].get();
      expect(ch.parentAbsolutePath).to.equal(pa.absolutePath);
      expect(ch.childCount).to.equal(0);
      expect(ch).to.not.have.property('children');
      expect(ch).to.not.have.property('samples');
      done();
    })
    .catch(done);
  });

  describe('with children >', () => {
    const howManyChildren = 7;

    afterEach(u.forceDelete);

    beforeEach(function beforeTest(done) {
      // Turn off the timeout for this "beforeEach" because
      // creating 100 subjects (or however many we want to create)
      // takes longer than the default timeout of 2000ms.
      // Also: accessing this.timeout() DOES NOT WORK with fat-arrow
      // syntax!

      let parentId;
      let previousId = parentId;
      this.timeout(0); // eslint-disable-line no-invalid-this

      const myParent1 = u
      .getSubjectPrototype(`${tu.namePrefix}parent1`, null);
      Subject.create(myParent1)
      .then((parent) => {
        parentId = parent.id;
        previousId = parent.id;
      })
      .then(() => {
        const childrenToCreate = [];
        for (let x = 0; x < howManyChildren; x++) {
          childrenToCreate.push({
            name: 'child' + x,
            parentId,
            isPublished: true,
          });
        }

        return Subject.bulkCreate(childrenToCreate,
          { individualHooks: true, validate: true });
      })
      .each((kid) => {
        const newParentId = previousId;
        previousId = kid.id;
        return kid.update({ parentId: newParentId });
      })
      .then(() => done())
      .catch(done);
    });

    it('Parent with lots of children', (done) => {
      Subject.findOne({
        where: {
          name: 'child' + (howManyChildren - 1),
        },
      })
      .then((child) => {
        const apParts = child.dataValues.absolutePath.split('.');
        expect(apParts.length).to.equal(howManyChildren + 1);
        done();
      })
      .catch(done);
    });
  });

  it('test out lots of different { includes: ... } options');
});
