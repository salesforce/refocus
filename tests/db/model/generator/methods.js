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
const CollectorGroup = tu.db.CollectorGroup;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const collectorStatuses = require('../../../../db/constants').collectorStatuses;

describe('tests/db/model/generator/methods.js >', () => {
  const now = Date.now();
  let clock;
  let generator1;
  let collector1;
  let collector2;
  let collector3;
  let collectorGroup1;
  let collectorGroup2;
  let collectorGroup3;

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

  let cg1 = { name: `${tu.namePrefix}-cg1`, description: 'test' };
  let cg2 = { name: `${tu.namePrefix}-cg2`, description: 'test' };
  let cg3 = { name: `${tu.namePrefix}-cg3`, description: 'test' };

  beforeEach(() =>
    GeneratorTemplate.create(gt1)
    .then((_gt1) => (gt1.id = _gt1.id))
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
      return Promise.join(
        CollectorGroup.create(cg1),
        CollectorGroup.create(cg2),
        CollectorGroup.create(cg3),
      );
    })
    .spread((cg1, cg2, cg3) => {
      collectorGroup1 = cg1;
      collectorGroup2 = cg2;
      collectorGroup3 = cg3;
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
      collectorGroup1.addCollectors([collector2, collector3])
      .then(() => generator1.updateWithCollectors({
        isActive: true,
        collectorGroup: cg1.name,
      }))
      .then((updated) => {
        expect(updated.currentCollector.name).to.equal(collector2.name);
        expect(updated.currentCollector.id).to.equal(collector2.id);
        done();
      })
      .catch(done);
    });

    // assignToCollector is called as a part of updateWithCollectors
    // in beforeUpdate hook
    it('collectors specified, first choice unavailable', (done) => {
      collectorGroup1.addCollectors([collector2, collector3])
      .then(() => collector2.update({ lastHeartbeat: 0 }))
      .then(() => generator1.updateWithCollectors({
        isActive: true,
        collectorGroup: cg1.name,
      }))
      .then((updated) => {
        expect(updated.currentCollector.name).to.equal(collector3.name);
        expect(updated.currentCollector.id).to.equal(collector3.id);
        done();
      })
      .catch(done);
    });

    // assignToCollector is called as a part of updateWithCollectors
    // in beforeUpdate hook
    it('collectors specified, none available (not assigned)', (done) => {
      collectorGroup1.addCollectors([collector2])
      .then(() => collector2.update({ lastHeartbeat: 0 }))
      .then(() => generator1.updateWithCollectors({
        isActive: true,
        collectorGroup: cg1.name,
      }))
      .then((updated) => {
        expect(updated.currentCollector).to.equal(null);
        done();
      })
      .catch(done);
    });

    it('collectors specified, isActive=false (unassigned)', () =>
      collectorGroup1.addCollectors([collector2, collector3])
      .then(() => generator1.updateWithCollectors({
        isActive: false,
        collectorGroup: cg1.name,
      }))
      .then((updated) => updated.update({ collectorId: collector3.id }))
      .then(() => generator1.reload())
      .then((reloaded) => {
        expect(reloaded.currentCollector.name).to.equal(collector3.name);
        expect(reloaded.currentCollector.id).to.equal(collector3.id);
        return reloaded.assignToCollector();
      })
      .then(() => expect(generator1.currentCollector).to.equal(null))
    );

    it('collectors specified, none available (unassigned)', () =>
      collectorGroup1.addCollectors([collector2])
      .then(() => collector2.update({ lastHeartbeat: 0 }))
      .then(() => generator1.updateWithCollectors({
        isActive: true,
        collectorGroup: cg1.name,
      }))
      .then(() => generator1.update({ collectorId: collector3.id }))
      .then(() => generator1.reload())
      .then(() => {
        expect(generator1.currentCollector.name).to.equal(collector3.name);
        expect(generator1.currentCollector.id).to.equal(collector3.id);
        return generator1.assignToCollector();
      })
      .then(() => expect(generator1.currentCollector).to.equal(null))
    );

    it('collectors specified, isActive=false', () =>
      collectorGroup1.addCollectors([collector2, collector3])
      .then(() => generator1.updateWithCollectors({
        isActive: false,
        collectorGroup: cg1.name,
      }))
      .then((updated) => {
        expect(updated.currentCollector).to.equal(null);
        return updated.assignToCollector();
      })
      .then(() => expect(generator1.currentCollector).to.equal(null))
    );

    it('collectors not specified (not assigned)', () => {
      expect(generator1.currentCollector).to.equal(null);
      return generator1.assignToCollector()
      .then(() => expect(generator1.currentCollector).to.equal(null));
    });

    it('collectors not specified (unassigned)', () =>
      generator1.update({ collectorId: collector3.id })
      .then(() => generator1.reload(generator1._modelOptions.defaultScope))
      .then(() => {
        expect(generator1.currentCollector.name).to.equal(collector3.name);
        expect(generator1.currentCollector.id).to.equal(collector3.id);
        return generator1.assignToCollector();
      })
      .then(() => expect(generator1.currentCollector).to.equal(null))
    );

    describe('distributeGenerators > ', () => {
      it('collectors specified, isActive=false (unassigned)', () =>
        collectorGroup1.addCollectors([collector2, collector3])
        .then(() => generator1.updateWithCollectors({
          isActive: false,
          collectorGroup: cg1.name,
        }))
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
        collectorGroup1.addCollectors([collector2])
        .then(() => collector2.update({ lastHeartbeat: 0 }))
        .then(() => generator1.updateWithCollectors({
          isActive: true,
          collectorGroup: cg1.name,
        }))
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
        collectorGroup1.addCollectors([collector2, collector3])
        .then(() => generator1.updateWithCollectors({
          isActive: false,
          collectorGroup: cg1.name,
        }))
        .then((updated) => {
          expect(updated.currentCollector).to.equal(null);
          return updated.assignToCollector();
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
        .then(() => generator1.reload(generator1._modelOptions.defaultScope))
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
    const coll4 = {
      name: 'collector4',
      version: '1.0.0',
      status: collectorStatuses.Stopped, // unavailable collector
      lastHeartbeat: now,
    };

    let generator2;
    let generator3;
    let generator4;
    let collector4;

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
        collector4 = _c4;
      })
    );

    it('Two possible collectors (out of three available) unassigned,' +
      ' generator assigned to first choice', () =>
      collectorGroup1.addCollectors([collector1, collector2, collector3, collector4])
      .then(() => generator1.updateWithCollectors({ // gen1 -> coll1
        isActive: true,
        collectorGroup: collectorGroup1.name,
      }))
      .then(() => generator1.update({ // gen1 -> coll1
        currentCollector: collector1,
        collectorId: collector1.id,
      }))

      // all 4 collectors assigned as possible collectors of generator2.
      .then(() => generator2.updateWithCollectors({
        isActive: true,
        collectorGroup: collectorGroup1.name,
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
      collectorGroup1.setCollectors([collector1, collector2, collector3, collector4])
      .then(() => Promise.all([
        generator1.updateWithCollectors({
          isActive: true,
          collectorGroup: collectorGroup1.name,
        }),
        generator2.updateWithCollectors({
          isActive: true,
          collectorGroup: collectorGroup1.name,
        }),
      ]))
      .then(() => Promise.all([
        generator1.update({ // gen1 -> coll1
          currentCollector: collector1,
          collectorId: collector1.id,
        }),
        generator2.update({ // gen2 -> coll2
          currentCollector: collector2,
          collectorId: collector2.id,
        }),
      ]))

      // all 4 collectors assigned as possible collectors of generator3.
      .then(() => generator3.updateWithCollectors({
        isActive: true,
        collectorGroup: collectorGroup1.name,
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
      collectorGroup1.setCollectors([collector1, collector2, collector3, collector4])
      .then(() => Promise.all([
        generator1.updateWithCollectors({
          isActive: true,
          collectorGroup: collectorGroup1.name,
        }),
        generator2.updateWithCollectors({
          isActive: true,
          collectorGroup: collectorGroup1.name,
        }),
        generator3.updateWithCollectors({
          isActive: true,
          collectorGroup: collectorGroup1.name,
        }),
      ]))
      .then(() => Promise.all([
        generator1.update({ // gen1 -> coll1
          currentCollector: collector1,
          collectorId: collector1.id,
        }),
        generator2.update({ // gen2 -> coll2
          currentCollector: collector2,
          collectorId: collector2.id,
        }),
        generator3.update({ // gen3 -> coll3
          currentCollector: collector3,
          collectorId: collector3.id,
        }),
      ]))

      // all 4 collectors assigned as possible collectors of generator4
      .then(() => generator4.updateWithCollectors({
        isActive: true,
        collectorGroup: collectorGroup1.name,
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
      collectorGroup1.setCollectors([collector1, collector2, collector3, collector4])
      .then(() => Promise.all([
        generator1.updateWithCollectors({
          isActive: true,
          collectorGroup: collectorGroup1.name,
        }),
        generator2.updateWithCollectors({
          isActive: true,
          collectorGroup: collectorGroup1.name,
        }),
        generator3.updateWithCollectors({
          isActive: true,
          collectorGroup: collectorGroup1.name,
        }),
        generator4.updateWithCollectors({
          isActive: true,
          collectorGroup: collectorGroup1.name,
        }),
      ]))
      .then(() => Promise.all([
        generator1.update({ // gen1 -> coll1
          currentCollector: collector1,
          collectorId: collector1.id,
        }),
        generator2.update({ // gen2 -> coll2
          currentCollector: collector2,
          collectorId: collector2.id,
        }),
        generator3.update({ // gen3 -> coll3
          currentCollector: collector3,
          collectorId: collector3.id,
        }),
        generator4.update({ // gen4 -> coll1
          currentCollector: collector1,
          collectorId: collector1.id,
        }),
      ]))

      // gen2 can be assigned to any collector
      .then(() => {
        // gen2 assigned to coll2
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
    ' collector name', () =>
      collectorGroup1.setCollectors([collector1, collector2, collector4])
      .then(() => Promise.all([
        generator1.updateWithCollectors({
          isActive: true,
          collectorGroup: collectorGroup1.name,
        }),
        generator2.updateWithCollectors({
          isActive: true,
          collectorGroup: collectorGroup1.name,
        }),
      ]))
      .then(() => Promise.all([
        generator1.update({ // gen1 -> coll1
          currentCollector: collector1,
          collectorId: collector1.id,
        }),
        generator2.update({ // gen2 -> coll2
          currentCollector: collector2,
          collectorId: collector2.id,
        }),
      ]))

      // gen2 can be assigned to any of 4 collectors
      /* generator3 possible collectors set to these 3:
      coll1 (Status=Running) -> currGenerator (1), possible generators(2)
      coll2 (Status=Running) -> currGenerator (1), possible generators(1)
      coll4 (Status=Stopped) -> currGenerator (0), possible generators(1)
      generator3 should be assigned to coll1 (breaking ties with coll2)
      */
      .then(() => generator3.updateWithCollectors({
        isActive: true,
        collectorGroup: collectorGroup1.name,
      }))
      .then(() => {
        expect(generator1.currentCollector.name).to.equal(collector1.name);
        expect(generator2.currentCollector.name).to.equal(collector2.name);

        // gen3 assigned to coll2
        expect(generator3.currentCollector.name).to.equal(collector1.name);
        expect(generator3.currentCollector.id).to.equal(collector1.id);
      })
    );

    it('No available collector', () =>
      collectorGroup1.setCollectors([collector1])
      .then(() => generator1.updateWithCollectors({
        isActive: true,
        collectorGroup: cg1.name,
      }))
      .then(() => generator1.update({ // gen1 -> coll1
        currentCollector: collector1,
        collectorId: collector1.id,
      }))
      .then(() => {
        expect(generator1.currentCollector.name).to.equal(collector1.name);
      })
      .then(() => collector1.update({ status: collectorStatuses.Stopped }))
      .then(() => generator1.reload())
      .then(() => {
        expect(generator1.currentCollector).to.equal(null);
      })
    );
  });
});
