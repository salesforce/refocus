/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/collectorGroup/create.js
 */

'use strict';  // eslint-disable-line strict
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Collector = tu.db.Collector;
const CollectorGroup = tu.db.CollectorGroup;

describe('tests/db/model/collectorGroup/create.js >', () => {
  let createdUser;
  beforeEach((done) => {
    tu.createUser('testUser')
    .then((user) => {
      createdUser = user;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('ok, create with all fields, check collectorGroup writer', (done) => {
    let cgObj;
    const collectorGroup = u.createCollectorGroup();
    collectorGroup.createdBy = createdUser.id;
    CollectorGroup.create(collectorGroup) // create collectorGroup
    .then((cg) => { // check fields
      cgObj = cg;
      expect(cg).to.have.property('name');
      expect(cg).to.have.property('description');
      expect(cg.name).to.be.equal(collectorGroup.name);
      expect(cg.description).to.be.equal(collectorGroup.description);
      expect(typeof cg.getWriters).to.equal('function');
      expect(typeof cg.getCollectors).to.equal('function');
      expect(cg.createdBy).to.be.equal(createdUser.id);
      expect(cg.updatedAt).to.not.be.null;
      expect(cg.createdAt).to.not.be.null;
      return cg.getWriters(); // check writers
    })
    .then((w) => {
      expect(w.length).to.be.equal(1);
      expect(w[0].email).to.be.equal('testUser@testUser.com');
      expect(w[0].CollectorGroupWriters.userId).to.be.equal(createdUser.id);
      expect(w[0].CollectorGroupWriters.collectorGroupId).to.be.equal(cgObj.id);
      return cgObj.isWritableBy(createdUser.id);
    })
    .then((isWritable) => { // is WritableBy should return true
      expect(isWritable).to.be.true;
      done();
    })
    .catch(done);
  });

  it('not ok, Create collectorGroup, error if invalid name', (done) => {
    const collectorGroup = u.createCollectorGroup();
    collectorGroup.name = 'Invalid@name';
    CollectorGroup.create(collectorGroup)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message).to.contain(
        'Validation is on name failed'
      );
      done();
    })
    .catch(done);
  });

  it('not ok, Create collectorGroup, error if description not provided',
  (done) => {
    const collectorGroup = u.createCollectorGroup();
    delete collectorGroup.description;
    CollectorGroup.create(collectorGroup)
    .then(() => done(tu.valError))
    .catch((err) => {
      expect(err.name).to.equal(tu.valErrorName);
      expect(err.message).to.contain(
        'description cannot be null'
      );
      done();
    })
    .catch(done);
  });

  describe('with collectors >', () => {
    let collectorObj;
    let collectorCreated;
    beforeEach((done) => {
      collectorObj = u.getCollectorObj();
      collectorObj.createdBy = createdUser.id;
      Collector.create(collectorObj) // create collector
      .then((collDbObj) => {
        collectorCreated = collDbObj;
        done();
      })
      .catch(done);
    });

    afterEach(() =>
      tu.forceDelete(tu.db.Collector, new Date())
      .then(() => tu.db.CollectorGroup, new Date())
    );

    it('ok, collectorGroup created with one collector', (done) => {
      const collGroupObj = u.createCollectorGroup();
      CollectorGroup.create(collGroupObj) // create collectorGroup
      .then((cg) => cg.addCollector(collectorCreated))
      .then((cg) => cg.getCollectors())
      .then((cgColl) => { // getCollectors on collectorGroup gives collector
        expect(cgColl).to.have.length(1);
        expect(cgColl[0].name).to.be.equal('___Collector');
        return Collector.findByPk(collectorCreated.id);
      })
      .then((coll) => coll.getCollectorGroup())
      .then((cg) => { // getCollectorGroup on collector gives collector group
        expect(cg.name).to.be.equal('___collGroupName');
        done();
      })
      .catch(done);
    });

    it('ok, collectorGroup created with multiple collectors', (done) => {
      const collectorObjSecond = u.getCollectorObj();
      collectorObjSecond.name += 'Second';
      let collectorCreatedSecond;
      Collector.create(collectorObjSecond) // create collector
      .then((collDbObj) => {
        collectorCreatedSecond = collDbObj;
        const collGroupObj = u.createCollectorGroup();
        return CollectorGroup.create(collGroupObj);  // create collectorGroup
      })
      .then((cg) =>
        cg.addCollectors([collectorCreated, collectorCreatedSecond]))
      .then((cg) => cg.getCollectors())
      .then((cgColl) => { // getCollectors on collectorGroup gives collector
        expect(cgColl).to.have.length(2);
        expect(cgColl[0].name).to.be.equal('___Collector');
        expect(cgColl[1].name).to.be.equal('___CollectorSecond');
        return Collector.findByPk(collectorCreated.id);
      })
      .then((coll) => coll.getCollectorGroup())
      .then((cg) => { // getCollectorGroup on collector gives collector group
        expect(cg.name).to.be.equal('___collGroupName');
        done();
      })
      .catch(done);
    });

    it('collector not assigned to collectorGroup if collector does ' +
      'not exist', (done) => {
      const collGroupObj = u.createCollectorGroup();
      collectorCreated.destroy() // delete collector
      .then(() => CollectorGroup.create(collGroupObj)) // create collectorGroup

      // add collector to collectorGroup
      .then((cg) => cg.addCollector(collectorCreated))
      .then((cg) => cg.getCollectors())

      // getCollectors on collectorGroup does not return collector
      .then((cgColl) => {
        expect(cgColl).to.have.length(0);
        done();
      })
      .catch(done);
    });
  });
});
