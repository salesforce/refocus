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
  let dbCollector1;
  let dbCollector2;
  let dbCollector3;

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
  ).spread((col1, col2, col3) => {
    dbCollector1 = col1;
    dbCollector2 = col2;
    dbCollector3 = col3;

    // set currentCollector by setting collectorId
    generator1.collectorId = col1.id;
    generator2.collectorId = col2.id;
    generator3.collectorId = col3.id;
  }));

  afterEach(() => clock.restore());
  afterEach(u.forceDelete);

  describe('class methods >', () => {
    describe('missedHeartbeat >', () => {
      it('some over threshold', () => {
        const interval = 15000;
        const tolerance = 5000;
        const fakeNow = new Date('2018-05-22T14:51:22');
        clock = sinon.useFakeTimers(fakeNow);
        collectorConfig.heartbeatIntervalMillis = interval;
        collectorConfig.heartbeatLatencyToleranceMillis = tolerance;

        return Collector.missedHeartbeat()
        .should.eventually.be.an('array').with.lengthOf(1);
      });

      it('all over threshold', () => {
        const interval = 15000;
        const tolerance = 5000;
        const fakeNow = new Date('2018-05-22T14:51:27');
        clock = sinon.useFakeTimers(fakeNow);
        collectorConfig.heartbeatIntervalMillis = interval;
        collectorConfig.heartbeatLatencyToleranceMillis = tolerance;

        return Collector.missedHeartbeat()
        .should.eventually.be.an('array').with.lengthOf(2);
      });

      it('none over threshold', () => {
        const interval = 15000;
        const tolerance = 5000;
        const fakeNow = new Date('2018-05-22T14:51:19');
        clock = sinon.useFakeTimers(fakeNow);
        collectorConfig.heartbeatIntervalMillis = interval;
        collectorConfig.heartbeatLatencyToleranceMillis = tolerance;

        return Collector.missedHeartbeat()
        .should.eventually.be.an('array').with.lengthOf(0);
      });
    });

    describe('checkMissedHeartbeat >', () => {
      /*
       Any generators which have dead collectors assigned (i.e. which missed
       their heartbeat) should be reassigned to a new collector

       How we test: assign current collectors to generators, let one
       collector miss the heartbeat and verify that the generator is reassigned
       to an alive collector.
       */
      beforeEach(() => GeneratorTemplate.create(generatorTemplate)
        .then((gt1) => generatorTemplate.id = gt1.id)
        /*
         On create, beforeCreate hook is triggered which tries to validate that
         generator is active and calls assignToCollector, which will reset the
         currentCollector to null.
         To bypass this logic, we set validate: false, hooks: false as second
         parameter in Generator.create
         */
        .then(() => Promise.join(
            Generator.create(generator1, { validate: false, hooks: false }),
            Generator.create(generator2, { validate: false, hooks: false }),
            Generator.create(generator3, { validate: false, hooks: false }),
          ).spread((gen1, gen2, gen3) => Promise.join(
              gen1.setPossibleCollectors(
                [dbCollector1, dbCollector2, dbCollector3]
              ),
              gen2.setPossibleCollectors(
                [dbCollector1, dbCollector2, dbCollector3]
              ),
              gen3.setPossibleCollectors(
                [dbCollector1, dbCollector2, dbCollector3]
              ),
            )
          )));

      afterEach(u.forceDelete);

      it('checkMissedHeartbeat', () => {
        const interval = 15000;
        const tolerance = 5000;
        const fakeNow = new Date('2018-05-22T14:51:21');
        clock = sinon.useFakeTimers(fakeNow);
        collectorConfig.heartbeatIntervalMillis = interval;
        collectorConfig.heartbeatLatencyToleranceMillis = tolerance;

        /* checkMissedHeartbeat identifies collector2 as dead because more than
         20000ms has passed since lastHeartbeat (sinon used to fake time).
         As a result, generator2 is reassigned to collector3. */
        return Collector.checkMissedHeartbeat()
        .then(() => Promise.join(
          Generator.find({ where: { name: generator1.name } }),
          Generator.find({ where: { name: generator2.name } }),
          Generator.find({ where: { name: generator3.name } }),
          Collector.find({ where: { name: collector2.name } }),
        ))
        .spread((gen1, gen2, gen3, coll2) => {
          expect(gen1.currentCollector.name).to.equal(collector1.name);
          expect(gen2.currentCollector.name).to.equal(collector3.name);
          expect(gen3.currentCollector.name).to.equal(collector3.name);
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
        const interval = 15000;
        const tolerance = 5000;
        const lastHeartbeat = new Date('2018-05-22T14:51:00');
        const fakeNow = new Date('2018-05-22T14:51:19');
        clock = sinon.useFakeTimers(fakeNow);
        collectorConfig.heartbeatIntervalMillis = interval;
        collectorConfig.heartbeatLatencyToleranceMillis = tolerance;

        Collector.build({ lastHeartbeat })
        .isAlive().should.be.true;
      });

      it('dead', () => {
        const interval = 15000;
        const tolerance = 3000;
        const lastHeartbeat = new Date('2018-05-22T14:51:00');
        const fakeNow = new Date('2018-05-22T14:51:19');
        clock = sinon.useFakeTimers(fakeNow);
        collectorConfig.heartbeatIntervalMillis = interval;
        collectorConfig.heartbeatLatencyToleranceMillis = tolerance;

        Collector.build({ lastHeartbeat })
        .isAlive().should.be.false;
      });

      it('undefined', () => {
        const interval = 15000;
        const tolerance = 5000;
        const lastHeartbeat = undefined;
        const fakeNow = new Date('2018-05-22T14:51:19');
        clock = sinon.useFakeTimers(fakeNow);
        collectorConfig.heartbeatIntervalMillis = interval;
        collectorConfig.heartbeatLatencyToleranceMillis = tolerance;

        Collector.build({ lastHeartbeat })
        .isAlive().should.be.false;
      });
    });

    describe('reassignGenerators >', () => {
      beforeEach(() => GeneratorTemplate.create(generatorTemplate)
        .then((gt1) => generatorTemplate.id = gt1.id)
        /*
         On create, beforeCreate hook is triggered which tries to validate that
         generator is active and calls assignToCollector, which will reset the
         currentCollector to null.
         To bypass this logic, we set validate: false, hooks: false as second
         parameter in Generator.create
         */
        .then(() => Promise.join(
            Generator.create(generator1, { validate: false, hooks: false }),
            Generator.create(generator2, { validate: false, hooks: false }),
            Generator.create(generator3, { validate: false, hooks: false }),
          ).spread((gen1, gen2, gen3) => Promise.join(
              gen1.setPossibleCollectors(
                [dbCollector1, dbCollector2, dbCollector3]
              ),
              gen2.setPossibleCollectors(
                [dbCollector1, dbCollector2, dbCollector3]
              ),
              gen3.setPossibleCollectors(
                [dbCollector1, dbCollector2, dbCollector3]
              ),
            )
          )));

      afterEach(u.forceDelete);

      it('reassignGenerators', () => {
        const interval = 15000;
        const tolerance = 5000;
        const fakeNow = new Date('2018-05-22T14:51:10');
        clock = sinon.useFakeTimers(fakeNow);
        collectorConfig.heartbeatIntervalMillis = interval;
        collectorConfig.heartbeatLatencyToleranceMillis = tolerance;

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
          expect(gen1.currentCollector.name).to.equal(collector2.name);
          expect(gen2.currentCollector.name).to.equal(collector2.name);
          expect(gen3.currentCollector.name).to.equal(collector3.name);
        });
      });

    });
  });
});
