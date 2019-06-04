/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/collector/delete.js
 */
'use strict';  // eslint-disable-line strict
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Collector = tu.db.Collector;

describe('tests/db/model/collector/delete.js >', () => {
  let collectorDb;
  beforeEach((done) => {
    tu.createUser('testUser')
    .then((user) => {
      const collectorObj = u.getCollectorObj();
      collectorObj.createdBy = user.id;
      return Collector.create(collectorObj);
    })
    .then((c) => {
      collectorDb = c;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('ok, bulk delete', (done) => {
    Collector.destroy({ where: { id: collectorDb.id } })
    .then(() => Collector.findAll())
    .then((res) => {
      expect(res.length).to.be.equal(0);
      done();
    })
    .catch(done);
  });

  it('ok, an instance delete', (done) => {
    Collector.findByPk(collectorDb.id)
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

  it('ok, should not be able to find a collector once deleted', (done) => {
    Collector.findByPk(collectorDb.id)
    .then((c) => c.destroy())
    .then((o) => Collector.findByPk(o.id))
    .then((o) => {
      expect(o).to.equal(null);
      done();
    })
    .catch(done);
  });
});
