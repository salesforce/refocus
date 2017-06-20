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
      u.collectorObj.createdBy = user.id;
      return Collector.create(u.collectorObj);
    })
    .then((c) => {
      collectorDb = c;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  it('Delete collector, expect error on bulk delete', (done) => {
    Collector.destroy({ where: { id: collectorDb.id } })
    .then(() => done(new Error('expecting CollectorDeleteConstraintError')))
    .catch((err) => {
      expect(err.name).to.equal('CollectorDeleteConstraintError');
      expect(err.message).to.contain(
        'Not allowed to delete the collector.'
      );
      done();
    });
  });

  it('Delete collector, expect error on an instance delete', (done) => {
    Collector.findById(collectorDb.id)
    .then((c) => c.destroy())
    .then(() => done(new Error('expecting CollectorDeleteConstraintError')))
    .catch((err) => {
      expect(err.name).to.equal('CollectorDeleteConstraintError');
      expect(err.message).to.contain(
        'Not allowed to delete the collector.'
      );
      done();
    });
  });
});
