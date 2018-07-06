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
    Promise.join(
      GeneratorTemplate.create(gt1),
      Generator.create(gen1),
      Collector.create(coll1),
      Collector.create(coll2),
      Collector.create(coll3),
    )
    .spread((_gt1, _gen1, _coll1, _coll2, _coll3) => {
      gt1.id = _gt1.id;
      gen1.id = _gen1.id;
      coll1.id = _coll1.id;
      coll2.id = _coll2.id;
      coll3.id = _coll3.id;
    })
  );

  beforeEach(() => {
    clock = sinon.useFakeTimers(now);
  });

  afterEach(() => clock.restore());
  afterEach(u.forceDelete);
  afterEach(gtUtil.forceDelete);

  describe('assignToCollector >', () => {
    it('collectors specified, first choice available', () =>
      Promise.resolve()
      .then(() => Generator.findById(gen1.id))
      .then((g) => g.updateWithCollectors({ possibleCollectors: [coll2.name, coll3.name] }))

      .then(() => Generator.findById(gen1.id))
      .then((g) => g.assignToCollector())

      .then(() => Generator.findById(gen1.id))
      .then((gen1) => expect(gen1.currentCollector).to.equal(coll2.name))
    );

    it('collectors specified, first choice unavailable', () =>
      Promise.join(
        Collector.findById(coll2.id),
        Generator.findById(gen1.id),
      )
      .spread((coll2, gen1) => Promise.join(
        coll2.update({ lastHeartbeat: 0 }),
        gen1.updateWithCollectors({ possibleCollectors: [coll2.name, coll3.name] }),
      ))

      .then(() => Generator.findById(gen1.id))
      .then((gen1) => gen1.assignToCollector())

      .then(() => Generator.findById(gen1.id))
      .then((gen1) => expect(gen1.currentCollector).to.equal(coll3.name))
    );

    it('collectors specified, none available (not changed)', () =>
      Promise.join(
        Collector.findById(coll2.id),
        Generator.findById(gen1.id),
      )
      .spread((coll2, gen1) => Promise.join(
        coll2.update({ lastHeartbeat: 0 }),
        gen1.updateWithCollectors({ possibleCollectors: [coll2.name] }),
      ))

      .then(() => Generator.findById(gen1.id))
      .then((gen1) => gen1.assignToCollector())

      .then(() => Generator.findById(gen1.id))
      .then((gen1) => expect(gen1.currentCollector).to.equal(null))
    );

    it('collectors not specified, first collector available', () =>
      Promise.resolve()
      .then(() => Generator.findById(gen1.id))
      .then((g) => g.assignToCollector())
      .then(() => Generator.findById(gen1.id))
      .then((gen1) => expect(gen1.currentCollector).to.equal(coll1.name))
    );

    it('collectors not specified, first collector unavailable', () =>
      Promise.resolve()
      .then(() => Collector.findById(coll1.id))
      .then((c) => c.update({ status: collectorStatuses.Stopped }))

      .then(() => Generator.findById(gen1.id))
      .then((g) => g.assignToCollector())

      .then(() => Generator.findById(gen1.id))
      .then((gen1) => expect(gen1.currentCollector).to.equal(coll2.name))
    );

    it('collectors not specified, none available (not changed)', () =>
      Promise.join(
        Collector.findById(coll1.id),
        Collector.findById(coll2.id),
        Collector.findById(coll3.id),
        Generator.findById(gen1.id),
      )
      .spread((coll1, coll2, coll3, gen1) => Promise.join([
        coll1.update({ status: collectorStatuses.Stopped }),
        coll2.update({ lastHeartbeat: 0 }),
        coll3.update({ lastHeartbeat: 0 }),
        gen1.update({ currentCollector: coll3.name }),
      ]))

      .then(() => Generator.findById(gen1.id))
      .then((g) => g.assignToCollector())

      .then(() => Generator.findById(gen1.id))
      .then((gen1) => expect(gen1.currentCollector).to.equal(coll3.name))
    );
  });
});
