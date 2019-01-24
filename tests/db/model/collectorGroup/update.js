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
const Collector = tu.db.Collector;
const CollectorGroup = tu.db.CollectorGroup;
const collectorUtils = require('../collector/utils');

describe('tests/db/model/collectorGroup/update.js >', () => {
  let collectorGroupDb;
  let collector1;
  let collector2;
  let collector3;

  beforeEach((done) => {
    tu.createUser('testUser')
      .then((user) => {
        const collectorGroupObj = u.createCollectorGroup();
        collectorGroupObj.createdBy = user.id;
        return CollectorGroup.create(collectorGroupObj);
      })
      .then((cg) => (collectorGroupDb = cg))
      .then(() => {
        collector1 = collectorUtils.getCollectorObj();
        collector1.name = 'coll-1';
        return Collector.create(collector1);
      })
      .then(() => {
        collector2 = collectorUtils.getCollectorObj();
        collector2.name = 'coll-2';
        return Collector.create(collector2);
      })
      .then(() => {
        collector3 = collectorUtils.getCollectorObj();
        collector3.name = 'coll-3';
        return Collector.create(collector3);
      })
      .then(() => done())
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

  it('add empty collector array to group does nothing', (done) => {
    collectorGroupDb.addCollectorsToGroup([collector1.name])
      .then((cg) => {
        expect(cg.collectors.length).to.equal(1);
        expect(cg.collectors[0]).to.have.property('name', collector1.name);
        return collectorGroupDb.addCollectorsToGroup([]);
      })
      .then((cg) => expect(cg.collectors.length).to.equal(1))
      .then(() => done())
      .catch(done);
  });

  it('add array of one collector to group', (done) => {
    collectorGroupDb.addCollectorsToGroup([collector1.name])
      .then((cg) => {
        expect(cg.collectors.length).to.equal(1);
        expect(cg.collectors[0]).to.have.property('name', collector1.name);
      })
      .then(() =>
        collectorGroupDb.addCollectorsToGroup([collector2.name]))
      .then((cg) => {
        expect(cg.collectors.length).to.equal(2);
        return done();
      })
      .catch(done);
  });

  it('add array of more than one collector to group', (done) => {
    collectorGroupDb.addCollectorsToGroup([collector1.name, collector2.name])
      .then((cg) => {
        expect(cg.collectors.length).to.equal(2);
        return done();
      })
      .catch(done);
  });

  it('fail when one collector is already assigned', (done) => {
    collectorGroupDb.addCollectorsToGroup([collector1.name])
      .then(() =>
        collectorGroupDb.addCollectorsToGroup([collector1.name]))
      .then((cg) => expect(cg.collectors).to.be.empty)
      .then(() => done(new Error('expecting rejection')))
      .catch((err) => {
        expect(err).to.have.property('message',
          'Cannot double-assign collector(s) [coll-1] to collector groups');
        done();
      })
      .catch(done);
  });

  it('fail when more than one collector already assigned', (done) => {
    collectorGroupDb.addCollectorsToGroup([collector1.name, collector2.name])
      .then(() => collectorGroupDb.addCollectorsToGroup([
        collector1.name,
        collector2.name,
      ]))
      .then((cg) => expect(cg.collectors).to.be.empty)
      .then(() => done(new Error('expecting rejection')))
      .catch((err) => {
        expect(err).to.have.property('message',
          'Cannot double-assign collector(s) [coll-1, coll-2] to collector ' +
          'groups');
        done();
      })
      .catch(done);
  });

  it('delete collector from group', (done) => {
    collectorGroupDb.addCollectorsToGroup([collector1.name, collector2.name])
      .then(() =>
        collectorGroupDb.deleteCollectorsFromGroup([collector1.name]))
      .then((cg) => {
        const colls = cg.get('collectors');
        expect(colls).to.have.lengthOf(1);
        expect(colls[0]).to.have.property('name', 'coll-2');
        done();
      })
      .catch(done);
  });

  it('fail deleting collector not in group', (done) => {
    collectorGroupDb.addCollectorsToGroup([collector1.name, collector2.name])
      .then(() =>
        collectorGroupDb.deleteCollectorsFromGroup([collector3.name]))
      .then((cg) => done(new Error('Expecting error')))
      .catch((err) => {
        expect(err).to.have.property('name', 'ValidationError');
        expect(err).to.have.property('message',
          'This collector group does not contain [coll-3]');
        done();
      })
      .catch(done);
  });
});
