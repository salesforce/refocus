/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/collector/methods.js
 */
'use strict';  // eslint-disable-line strict

const chai = require('chai');
const expect = chai.expect;
chai.use(require('chai-as-promised'));
chai.should();
const sinon = require('sinon');
const Promise = require('bluebird');
const tu = require('../../../testUtils');
const u = require('./utils');
const collectorStatuses = require('../../../../db/constants').collectorStatuses;
const Collector = tu.db.Collector;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const sgUtils = require('../generator/utils');
const collectorConfig = require('../../../../config/collectorConfig');
const gtUtil = sgUtils.gtUtil;

describe('tests/db/model/collector/methods.js >', () => {
  let clock;

  const collector1 = u.getCollectorObj();
  const collector2 = u.getCollectorObj();
  const collector3 = u.getCollectorObj();

  collector2.name += 'secondCollector';
  collector2.status = 'Running';
  collector2.lastHeartbeat = new Date('2018-05-22T14:51:00');

  collector3.name += 'thirdCollector';
  collector3.status = 'Running';
  collector3.lastHeartbeat = new Date('2018-05-22T14:51:05');

  const generatorTemplate = gtUtil.getGeneratorTemplate();
  const generator1 = sgUtils.getGenerator();
  const generator2 = sgUtils.getGenerator();
  const generator3 = sgUtils.getGenerator();

  generator1.name += '1';
  generator2.name += '2';
  generator3.name += '3';

  generator1.currentCollector = collector1.name;
  generator2.currentCollector = collector2.name;
  generator3.currentCollector = collector3.name;

  generator1.possibleCollectors = [collector1.name, collector2.name, collector3.name];
  generator2.possibleCollectors = [collector1.name, collector2.name, collector3.name];
  generator3.possibleCollectors = [collector1.name, collector2.name, collector3.name];

  generator1.isActive = true;
  generator2.isActive = true;
  generator3.isActive = true;

  beforeEach(() => Promise.join(
    Collector.create(collector1),
    Collector.create(collector2),
    Collector.create(collector3),
  ));

  afterEach(() => clock.restore());
  afterEach(u.forceDelete);

  describe('class methods >', () => {
    describe('missedHeartbeat >', () => {
      it('some over threshold', () => {
        const threshold = 3000;
        const fakeNow = new Date('2018-05-22T14:51:07');
        clock = sinon.useFakeTimers(fakeNow);
        collectorConfig.heartbeatLatencyToleranceMillis = threshold;

        return Collector.missedHeartbeat()
        .should.eventually.be.an('array').with.lengthOf(1);
      });

      it('all over threshold', () => {
        const threshold = 1000;
        const fakeNow = new Date('2018-05-22T14:51:07');
        clock = sinon.useFakeTimers(fakeNow);
        collectorConfig.heartbeatLatencyToleranceMillis = threshold;

        return Collector.missedHeartbeat()
        .should.eventually.be.an('array').with.lengthOf(2);
      });

      it('none over threshold', () => {
        const threshold = 10000;
        const fakeNow = new Date('2018-05-22T14:51:07');
        clock = sinon.useFakeTimers(fakeNow);
        collectorConfig.heartbeatLatencyToleranceMillis = threshold;

        return Collector.missedHeartbeat()
        .should.eventually.be.an('array').with.lengthOf(0);
      });
    });

    describe('checkMissedHeartbeat >', () => {

      beforeEach(() =>
        GeneratorTemplate.create(generatorTemplate)
        .then((gt1) => generatorTemplate.id = gt1.id)
        .then(() => Promise.join(
          Generator.createWithCollectors(generator1),
          Generator.createWithCollectors(generator2),
          Generator.createWithCollectors(generator3),
        ))
      );

      afterEach(u.forceDelete);

      it('checkMissedHeartbeat', () => {
        const threshold = 3000;
        const fakeNow = new Date('2018-05-22T14:51:07');
        clock = sinon.useFakeTimers(fakeNow);
        collectorConfig.heartbeatLatencyToleranceMillis = threshold;

        return Collector.checkMissedHeartbeat()
        .then(() => Promise.join(
          Generator.find({ where: { name: generator1.name } }),
          Generator.find({ where: { name: generator2.name } }),
          Generator.find({ where: { name: generator3.name } }),
          Collector.find({ where: { name: collector2.name } }),
        ))
        .spread((gen1, gen2, gen3, coll2) => {
          expect(gen1.currentCollector).to.equal(collector1.name);
          expect(gen2.currentCollector).to.equal(collector3.name);
          expect(gen3.currentCollector).to.equal(collector3.name);
          expect(coll2.status).to.equal(collectorStatuses.MissedHeartbeat);
        });
      });
    });
  });

  describe('instanceMethods >', () => {
    describe('isRunning >', () => {

      it('running', () => {
        Collector.build({ status: collectorStatuses.Running })
        .isRunning().should.be.true;
      });

      it('not running', () => {
        Collector.build({ status: collectorStatuses.Stopped })
        .isRunning().should.be.false;
      });

      it('undefined', () => {
        Collector.build({})
        .isRunning().should.be.false;
      });

    });

    describe('isAlive >', () => {
      it('alive', () => {
        const threshold = 3000;
        const lastHeartbeat = new Date('2018-05-22T14:51:05');
        const fakeNow = new Date('2018-05-22T14:51:07');
        clock = sinon.useFakeTimers(fakeNow);
        collectorConfig.heartbeatLatencyToleranceMillis = threshold;

        Collector.build({ lastHeartbeat })
        .isAlive().should.be.true;
      });

      it('dead', () => {
        const threshold = 1000;
        const lastHeartbeat = new Date('2018-05-22T14:51:05');
        const fakeNow = new Date('2018-05-22T14:51:07');
        clock = sinon.useFakeTimers(fakeNow);
        collectorConfig.heartbeatLatencyToleranceMillis = threshold;

        Collector.build({ lastHeartbeat })
        .isAlive().should.be.false;
      });

      it('undefined', () => {
        const threshold = 1000;
        const lastHeartbeat = undefined;
        const fakeNow = new Date('2018-05-22T14:51:07');
        clock = sinon.useFakeTimers(fakeNow);
        collectorConfig.heartbeatLatencyToleranceMillis = threshold;

        Collector.build({ lastHeartbeat })
        .isAlive().should.be.false;
      });

    });

    describe('reassignGenerators >', () => {
      beforeEach(() =>
        GeneratorTemplate.create(generatorTemplate)
        .then((gt1) => generatorTemplate.id = gt1.id)
        .then(() => Promise.join(
          Generator.createWithCollectors(generator1),
          Generator.createWithCollectors(generator2),
          Generator.createWithCollectors(generator3),
        ))
      );

      afterEach(u.forceDelete);

      it('reassignGenerators', () => {
        const threshold = 10000;
        const fakeNow = new Date('2018-05-22T14:51:07');
        clock = sinon.useFakeTimers(fakeNow);
        collectorConfig.heartbeatLatencyToleranceMillis = threshold;

        return Promise.resolve()
        .then(() => Collector.find({ where: { name: collector1.name } }))
        .then((c1) => c1.update({ status: collectorStatuses.Stopped }))
        .then((c1) => c1.reassignGenerators())

        .then(() => Promise.join(
          Generator.find({ where: { name: generator1.name } }),
          Generator.find({ where: { name: generator2.name } }),
          Generator.find({ where: { name: generator3.name } }),
        ))
        .spread((gen1, gen2, gen3) => {
          expect(gen1.currentCollector).to.equal(collector2.name);
          expect(gen2.currentCollector).to.equal(collector2.name);
          expect(gen3.currentCollector).to.equal(collector3.name);
        });
      });

    });
  });
});
