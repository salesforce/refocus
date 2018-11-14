/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/collectorGroup/update.js
 */

'use strict';  // eslint-disable-line strict
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const CollectorGroup = tu.db.CollectorGroup;

describe('tests/db/model/collectorGroup/find.js >', () => {
  let collectorGroupDb;
  beforeEach((done) => {
    tu.createUser('testUser')
    .then((user) => {
      const collectorGroupObj = u.getCollectorGroupObj();
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

  it('Update name OK', (done) => {
    expect(collectorGroupDb.name).to.be.equal('___collGroupName'); // before
    collectorGroupDb.update({ name: '___collGroupNameChanged' })
    .then((obj) => {
      expect(obj.name).to.be.equal('___collGroupNameChanged'); // after
      done();
    })
    .catch(done);
  });

  it('Update description OK', (done) => {
    expect(collectorGroupDb.description).to.be.include(
    'This is a dummy collectorGroup object for testing.'
    ); // before
    collectorGroupDb.update({ description: 'Changed description' })
    .then((obj) => {
      expect(obj.description).to.be.equal('Changed description'); // after
      done();
    })
    .catch(done);
  });
});
