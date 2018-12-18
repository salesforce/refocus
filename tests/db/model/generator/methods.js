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
const featureToggles = require('feature-toggles');

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

    describe('with distributeGenerators toggle on > ', () => {
      const initialFeatureState = featureToggles
        .isFeatureEnabled('distributeGenerators');
      before(() => tu.toggleOverride('distributeGenerators', true));
      after(() => tu.toggleOverride(
        'distributeGenerators', initialFeatureState));

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
          return generator1.assignToCollector();
        })
        .then(() => {
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
          return generator1.assignToCollector();
        })
        .then(() => {
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
          return generator1.assignToCollector();
        })
        .then(() => {
          expect(generator1.currentCollector).to.equal(null);
        })
      );

      it('collectors not specified (not assigned)', (done) => {
        expect(generator1.currentCollector).to.equal(null);
        generator1.assignToCollector()
        .then(() => {
          expect(generator1.currentCollector).to.equal(null);
          done();
        })
        .catch(done);
      });

      it('collectors not specified (unassigned)', () =>
        generator1.update({ collectorId: collector3.id })
        .then(() => generator1.reload())
        .then(() => {
          expect(generator1.currentCollector.name).to.equal(collector3.name);
          expect(generator1.currentCollector.id).to.equal(collector3.id);
          return generator1.assignToCollector();
        })
        .then(() => {
          expect(generator1.currentCollector).to.equal(null);
        })
      );
    });
  });

  describe('getMostAvailableCollector >', () => {
    const initialFeatureState = featureToggles
      .isFeatureEnabled('distributeGenerators');
    before(() => tu.toggleOverride('distributeGenerators', true));
    after(() => tu.toggleOverride('distributeGenerators', initialFeatureState));

    const coll4 = {
      name: 'collector4',
      version: '1.0.0',
      status: collectorStatuses.Stopped, // unavailable collector
      lastHeartbeat: now,
    };

    let generator2;
    let generator3;
    let generator4;

    const gen2 = u.getGenerator();
    gen2.name += '-2';
    const gen3 = u.getGenerator();
    gen3.name += '-3';
    const gen4 = u.getGenerator();
    gen4.name += '-4';

    beforeEach(() => Promise.join(
        Generator.create(gen2),
        Generator.create(gen3),
        Generator.create(gen4),
        Collector.create(coll4)
      )
      .spread((_g2, _g3, _g4, _c4) => {
        generator2 = _g2;
        generator3 = _g3;
        generator4 = _g4;
      })
    );

    it('Two possible collectors (out of three available) unassigned,' +
      ' generator assigned to first choice', () =>

      generator1.updateWithCollectors({ // gen1 -> coll1
        isActive: true,
        possibleCollectors: [coll1.name],
      })

      // all 4 collectors assigned as possible collectors of generator2.
      .then(() => generator2.updateWithCollectors({
        isActive: true,
        possibleCollectors: [coll1.name, coll2.name, coll3.name, coll4.name],
      }))
      .then(() => {
        expect(generator1.currentCollector.name).to.equal(collector1.name);

        // generator2 assigned to collector2
        expect(generator2.currentCollector.name).to.equal(collector2.name);
        expect(generator2.currentCollector.id).to.equal(collector2.id);
      })
    );

    it('One possible collector (out of three available) unassigned, generator' +
      ' assigned to the only choice', () =>
      Promise.all([
        generator1.updateWithCollectors({ // gen1 -> coll1
          isActive: true,
          possibleCollectors: [coll1.name],
        }),
        generator2.updateWithCollectors({ // gen2 -> coll2
          isActive: true,
          possibleCollectors: [coll2.name],
        }),
      ])

      // all 4 collectors assigned as possible collectors of generator3.
      .then(() => generator3.updateWithCollectors({
        isActive: true,
        possibleCollectors: [coll1.name, coll2.name, coll3.name, coll4.name],
      }))
      .then(() => {
        expect(generator1.currentCollector.name).to.equal(collector1.name);
        expect(generator2.currentCollector.name).to.equal(collector2.name);

        // generator3 assigned to collector3
        expect(generator3.currentCollector.name).to.equal(collector3.name);
        expect(generator3.currentCollector.id).to.equal(collector3.id);
      })
    );

    it('All possible collectors assigned (except the stopped one), generator' +
      ' assigned to first choice', () =>
      Promise.all([
        generator1.updateWithCollectors({ // gen1 -> coll1
          isActive: true,
          possibleCollectors: [coll1.name],
        }),
        generator2.updateWithCollectors({ // gen2 -> coll2
          isActive: true,
          possibleCollectors: [coll2.name],
        }),
        generator3.updateWithCollectors({ // gen3 -> coll3
          isActive: true,
          possibleCollectors: [coll3.name],
        }),
      ])

      // all 4 collectors assigned as possible collectors of generator4
      .then(() => generator4.updateWithCollectors({
        isActive: true,
        possibleCollectors: [coll1.name, coll2.name, coll3.name, coll4.name],
      }))
      .then(() => {
        expect(generator1.currentCollector.name).to.equal(collector1.name);
        expect(generator2.currentCollector.name).to.equal(collector2.name);
        expect(generator3.currentCollector.name).to.equal(collector3.name);

        // generator4 is assigned to collector1
        expect(generator4.currentCollector.name).to.equal(collector1.name);
        expect(generator4.currentCollector.id).to.equal(collector1.id);
      })
    );

    it('Collector with assigned generator stops, generator reassigned to' +
      ' collector with least number of current generators', () =>
      Promise.all([
        generator1.updateWithCollectors({ // gen1 -> coll1
          isActive: true,
          possibleCollectors: [coll1.name],
        }),
        generator2.updateWithCollectors({ // gen2 -> coll2
          isActive: true,
          possibleCollectors: [coll2.name],
        }),
        generator3.updateWithCollectors({ // gen3 -> coll3
          isActive: true,
          possibleCollectors: [coll3.name],
        }),
        generator4.updateWithCollectors({ // gen4 -> coll1
          isActive: true,
          possibleCollectors: [coll1.name],
        }),
      ])

      // gen2 can be assigned to any collector
      .then(() => generator2.updateWithCollectors({
        possibleCollectors: [coll1.name, coll2.name, coll3.name, coll4.name],
      }))
      .then(() => {
        // gen2 still assigned to coll2
        expect(generator2.currentCollector.name).to.equal(collector2.name);

        /* stop collector2 -> this should reassign gen2 to coll3 because
        coll1 has 2 generators assigned and coll3 has one generator assigned
        coll4 is Stopped. */
        return collector2.update({ status: collectorStatuses.Stopped });
      })
      .then(() => generator2.reload())
      .then(() => {
        expect(generator1.currentCollector.name).to.equal(collector1.name);
        expect(generator3.currentCollector.name).to.equal(collector3.name);
        expect(generator4.currentCollector.name).to.equal(collector1.name);

        // gen2 assigned to coll3
        expect(generator2.currentCollector.name).to.equal(collector3.name);
        expect(generator2.currentCollector.id).to.equal(collector3.id);
      })
    );

    it('Generator assignment breaks number of currents generators ties using' +
    ' number of possible generators', () =>
      Promise.all([
        generator1.updateWithCollectors({ // gen1 -> coll1
          isActive: true,
          possibleCollectors: [coll1.name],
        }),
        generator2.updateWithCollectors({ // gen2 -> coll2
          isActive: true,
          possibleCollectors: [coll2.name],
        }),
      ])

      // gen2 can be assigned to any of 4 collectors
      .then(() => generator2.updateWithCollectors({
        possibleCollectors: [coll2.name, coll3.name, coll1.name, coll4.name],
      }))

      /* generator3 possible collectors set to these 3:
      coll1 (Status=Running) -> currGenerator (1), possible generators(2)
      coll2 (Status=Running) -> currGenerator (1), possible generators(1)
      coll4 (Status=Stopped) -> currGenerator (0), possible generators(1)
      generator3 should be assigned to coll2 (breaking ties with coll1)
      */
      .then(() => generator3.updateWithCollectors({
        isActive: true,
        possibleCollectors: [coll1.name, coll2.name, coll4.name],
      }))
      .then(() => {
        expect(generator1.currentCollector.name).to.equal(collector1.name);
        expect(generator2.currentCollector.name).to.equal(collector2.name);

        // gen3 assigned to coll2
        expect(generator3.currentCollector.name).to.equal(collector2.name);
        expect(generator3.currentCollector.id).to.equal(collector2.id);
      })
    );

    it('No available collector', () =>

      generator1.updateWithCollectors({ // gen1 -> coll1
        isActive: true,
        possibleCollectors: [coll1.name],
      })
      .then(() => collector1.update({ status: collectorStatuses.Stopped }))
      .then(() => generator1.reload())
      .then(() => {
        expect(generator1.currentCollector).to.equal(null);
      })
    );
  });
});
