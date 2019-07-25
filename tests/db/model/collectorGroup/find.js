/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/collectorGroup/find.js
 */

'use strict';  // eslint-disable-line strict
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const CollectorGroup = tu.db.CollectorGroup;
const Collector = tu.db.Collector;

describe('tests/db/model/collectorGroup/find.js >', () => {
  let collectorGroupDb;
  let createdUser;
  beforeEach((done) => {
    tu.createUser('testUser')
    .then((user) => {
      createdUser = user;
      const collectorGroupObj = u.createCollectorGroup();
      collectorGroupObj.createdBy = user.id;
      return CollectorGroup.create(collectorGroupObj); // create collectorGroup
    })
    .then((cg) => {
      collectorGroupDb = cg;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('Find by Id', (done) => {
    CollectorGroup.findByPk(collectorGroupDb.id)
    .then((cg) => {
      expect(cg).to.have.property('name');
      expect(cg).to.have.property('description');
      expect(cg.name).to.be.equal(collectorGroupDb.name);
      expect(cg.description).to.be.equal(collectorGroupDb.description);
      expect(typeof cg.getWriters).to.equal('function');
      expect(typeof cg.getCollectors).to.equal('function');
      expect(cg.createdBy).to.be.equal(createdUser.id);
      expect(cg.updatedAt).to.not.be.null;
      expect(cg.createdAt).to.not.be.null;
      done();
    })
    .catch(done);
  });

  it('Find, using where', (done) => {
    CollectorGroup.findOne({ where: { name: collectorGroupDb.name } })
    .then((cg) => {
      expect(cg).to.have.property('name');
      expect(cg).to.have.property('description');
      expect(cg.name).to.be.equal(collectorGroupDb.name);
      expect(cg.description).to.be.equal(collectorGroupDb.description);
      expect(typeof cg.getWriters).to.equal('function');
      expect(typeof cg.getCollectors).to.equal('function');
      expect(cg.createdBy).to.be.equal(createdUser.id);
      expect(cg.updatedAt).to.not.be.null;
      expect(cg.createdAt).to.not.be.null;
      done();
    })
    .catch(done);
  });

  it('Find all', (done) => {
    const collectorGroupObj = u.createCollectorGroup();
    collectorGroupObj.name += 'Second';
    CollectorGroup.create(collectorGroupObj) // create second collector group
    .then(() => CollectorGroup.findAll()) // find all collector groups
    .then((cgs) => {
      expect(cgs.length).to.be.equal(2);
      expect(cgs[0]).to.have.property('name');
      expect(cgs[0]).to.have.property('description');
      expect(cgs[0].name).to.be.equal(collectorGroupDb.name);
      expect(cgs[0].description).to.be.equal(collectorGroupDb.description);
      expect(typeof cgs[0].getWriters).to.equal('function');
      expect(typeof cgs[0].getCollectors).to.equal('function');
      expect(cgs[0].createdBy).to.be.equal(createdUser.id);
      expect(cgs[0].updatedAt).to.not.be.null;
      expect(cgs[0].createdAt).to.not.be.null;
      done();
    })
    .catch(done);
  });

  it('get related collectors', (done) => {
    const collectorObj1 = u.getCollectorObj();
    collectorObj1.name += 'First'; // first collector

    const collectorObj2 = u.getCollectorObj();
    collectorObj2.name += 'Second'; // second collector

    Collector.create(collectorObj1) // create first collector
    .then((c1) => collectorGroupDb.addCollector(c1)) // add to collector group
    .then(() => Collector.create(collectorObj2)) // create second collector
    .then((c2) => collectorGroupDb.addCollector(c2)) // add to collector group
    .then(() => collectorGroupDb.getCollectors()) // get collectors
    .then((colls) => {
      expect(colls).to.have.length(2);
      expect(colls[0].name).to.be.equal('___CollectorFirst');
      expect(colls[1].name).to.be.equal('___CollectorSecond');
      done();
    })
    .catch(done);
  });

  it('get related writers', (done) => {
    tu.createUser('testUserSecond') // create second user
    .then((user) => collectorGroupDb.addWriter(user)) // add user as writer
    .then(() => collectorGroupDb.getWriters()) // get writers
    .then((writers) => {
      expect(writers.length).to.be.equal(2);
      expect(writers[0].email).to.be.equal('testUser@testUser.com');
      expect(writers[0].CollectorGroupWriters.userId).to.be
        .equal(createdUser.id);
      expect(writers[0].CollectorGroupWriters.collectorGroupId).to.be
        .equal(collectorGroupDb.id);
      expect(writers[1].email).to.be.equal('testUserSecond@testUserSecond.com');
      return collectorGroupDb.isWritableBy(createdUser.id);
    })
    .then((isWritable) => { // is WritableBy should return true
      expect(isWritable).to.be.true;
      done();
    })
    .catch(done);
  });
});
