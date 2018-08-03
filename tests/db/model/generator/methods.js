/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/generator/methods.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const Promise = require('bluebird');
const sinon = require('sinon');
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const Generator = tu.db.Generator;
const Collector = tu.db.Collector;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const collectorStatuses = require('../../../../db/constants').collectorStatuses;

describe('tests/db/model/generator/methods.js >', () => {
  let clock;
  let now = Date.now();
  let generator1;
  let collector1;
  let collector2;
  let collector3;

  const gen1 = u.getGenerator();
  const gt1 = gtUtil.getGeneratorTemplate();

  const coll1 = {
    name: 'collector1',
    version: '1.0.0',
    status: collectorStatuses.Running,
    lastHeartbeat: now,
  };
  const coll2 = {
    name: 'collector2',
    version: '1.0.0',
    status: collectorStatuses.Running,
    lastHeartbeat: now,
  };
  const coll3 = {
    name: 'collector3',
    version: '1.0.0',
    status: collectorStatuses.Running,
    lastHeartbeat: now,
  };

  beforeEach(() =>
    GeneratorTemplate.create(gt1)
    .then((_gt1) => gt1.id = _gt1.id)
    .then(() => Promise.join(
      Generator.create(gen1),
      Collector.create(coll1),
      Collector.create(coll2),
      Collector.create(coll3),
    ))
    .spread((_gen1, _coll1, _coll2, _coll3) => {
      generator1 = _gen1;
      collector1 = _coll1;
      collector2 = _coll2;
      collector3 = _coll3;
    })
  );

  beforeEach(() => {
    clock = sinon.useFakeTimers(now);
  });

  afterEach(() => clock.restore());
  afterEach(u.forceDelete);
  afterEach(gtUtil.forceDelete);

  describe('assignToCollector >', () => {
    // assignToCollector is called as a part of updateWithCollectors
    // in beforeUpdate hook
    it('collectors specified, first choice available', (done) => {
      generator1.updateWithCollectors({
        isActive: true,
        possibleCollectors: [coll2.name, coll3.name],
      })
      .then(() => {
        expect(generator1.currentCollector.name).to.equal(collector2.name);
        expect(generator1.currentCollector.id).to.equal(collector2.id);
        done();
      })
      .catch(done);
    });

    // assignToCollector is called as a part of updateWithCollectors
    // in beforeUpdate hook
    it('collectors specified, first choice unavailable', (done) => {
      collector2.update({ lastHeartbeat: 0 })
      .then(() => generator1.updateWithCollectors({
        isActive: true, possibleCollectors: [coll2.name, coll3.name],
      }))
      .then(() => {
        expect(generator1.currentCollector.name).to.equal(collector3.name);
        expect(generator1.currentCollector.id).to.equal(collector3.id);
        done();
      })
      .catch(done);
    });

    // assignToCollector is called as a part of updateWithCollectors
    // in beforeUpdate hook
    it('collectors specified, none available (not assigned)', (done) => {
      collector2.update({ lastHeartbeat: 0 })
      .then(() => generator1.updateWithCollectors({
        isActive: true, possibleCollectors: [coll2.name],
      }))
      .then(() => {
        expect(generator1.currentCollector).to.equal(null);
        done();
      })
      .catch(done);
    });

    it('collectors specified, isActive=false (unassigned)', () =>
      generator1.updateWithCollectors({
        isActive: false,
        possibleCollectors: [coll2.name, coll3.name],
      })
      .then(() => generator1.update({ collectorId: collector3.id }))
      .then(() => generator1.reload())
      .then(() => {
        expect(generator1.currentCollector.name).to.equal(collector3.name);
        expect(generator1.currentCollector.id).to.equal(collector3.id);
        generator1.assignToCollector();
        expect(generator1.currentCollector).to.equal(null);
      })
    );

    it('collectors specified, none available (unassigned)', () =>
      Promise.all([
        collector2.update({ lastHeartbeat: 0 }),
        generator1.updateWithCollectors({
          isActive: true,
          possibleCollectors: [coll2.name],
        }),
      ])
      .then(() => generator1.update({ collectorId: collector3.id }))
      .then(() => generator1.reload())
      .then(() => {
        expect(generator1.currentCollector.name).to.equal(collector3.name);
        expect(generator1.currentCollector.id).to.equal(collector3.id);
        generator1.assignToCollector();
        expect(generator1.currentCollector).to.equal(null);
      })
    );

    it('collectors specified, isActive=false', () =>
      generator1.updateWithCollectors({
        isActive: false,
        possibleCollectors: [coll2.name, coll3.name],
      })
      .then(() => {
        expect(generator1.currentCollector).to.equal(null);
        generator1.assignToCollector();
        expect(generator1.currentCollector).to.equal(null);
      })
    );

    it('collectors not specified (not assigned)', () => {
      expect(generator1.currentCollector).to.equal(null);
      generator1.assignToCollector();
      expect(generator1.currentCollector).to.equal(null);
    });

    it('collectors not specified (unassigned)', () =>
      generator1.update({ collectorId: collector3.id })
      .then(() => generator1.reload())
      .then(() => {
        expect(generator1.currentCollector.name).to.equal(collector3.name);
        expect(generator1.currentCollector.id).to.equal(collector3.id);
        generator1.assignToCollector();
        expect(generator1.currentCollector).to.equal(null);
      })
    );
  });
});
