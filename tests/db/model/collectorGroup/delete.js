/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/collectorGroup/delete.js
 */
'use strict';  // eslint-disable-line strict
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const CollectorGroup = tu.db.CollectorGroup;
const Collector = tu.db.Collector;

describe('tests/db/model/collectorGroup/delete.js >', () => {
  let collectorGroupDb;
  beforeEach((done) => {
    tu.createUser('testUser')
    .then((user) => {
      const collectorGroupObj = u.getCollectorGroupObj();
      collectorGroupObj.createdBy = user.id;
      return CollectorGroup.create(collectorGroupObj); // create collector group
    })
    .then((cg) => {
      collectorGroupDb = cg;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('ok, bulk delete', (done) => {
    CollectorGroup.destroy({ where: { id: collectorGroupDb.id } })
    .then(() => CollectorGroup.findAll())
    .then((res) => {
      expect(res.length).to.be.equal(0);
      done();
    })
    .catch(done);
  });

  it('ok, an instance delete', (done) => {
    CollectorGroup.findById(collectorGroupDb.id)
    .then((c) => c.destroy())
    .then((o) => {
      if (o.deletedAt && (o.isDeleted !== 0)) {
        done();
      } else {
        done(new Error('expecting it to be soft-deleted'));
      }
    })
    .catch(done);
  });

  it('ok, should not be able to find a collectorGroup once deleted', (done) => {
    CollectorGroup.findById(collectorGroupDb.id)
    .then((c) => c.destroy())
    .then((o) => CollectorGroup.findById(o.id))
    .then((o) => {
      expect(o).to.equal(null);
      done();
    })
    .catch(done);
  });

  describe('with collector >', () => {
    let collectorObj;
    let collectorCreated;
    beforeEach((done) => {
      collectorObj = u.getCollectorObj();
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

    it('ok, collector will exist when CollectorGroup deleted', (done) => {
      // add collector to collectorGroup
      collectorGroupDb.addCollector(collectorCreated)
      .then((cg) => cg.getCollectors())
      .then((cgColl) => { // getCollectors on collectorGroup gives collector
        expect(cgColl).to.have.length(1);
        expect(cgColl[0].name).to.be.equal('___Collector');
        return CollectorGroup.findById(collectorGroupDb.id);
      })
      .then((cg) => cg.destroy()) // delete collectorGroup
      .then(() => Collector.findById(collectorCreated.id))
      .then((coll) => { // collector exists
        expect(coll.name).to.be.equal('___Collector');
        done();
      })
      .catch(done);
    });
  });
});
