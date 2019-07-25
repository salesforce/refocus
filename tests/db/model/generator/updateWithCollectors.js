/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/generator/updateWithCollectors.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
require('chai').use(require('chai-as-promised')).should();
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const Generator = tu.db.Generator;
const Collector = tu.db.Collector;
const CollectorGroup = tu.db.CollectorGroup;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const THREE = 3;
const testStartTime = new Date();

describe('tests/db/model/generator/updateWithCollectors.js >', () => {
  const generator = u.getGenerator();
  const generatorTemplate = gtUtil.getGeneratorTemplate();

  let generatorDBInstance;
  let sgtDBInstance;
  let collector1 = { name: 'hello', version: '1.0.0' };
  let collector2 = { name: 'beautiful', version: '1.0.0' };
  let collector3 = { name: 'world', version: '1.0.0' };
  let collectorGroup1 = { name: `${tu.namePrefix}-cg1`, description: 'test' };
  let collectorGroup2 = { name: `${tu.namePrefix}-cg2`, description: 'test' };

  before((done) => {
    GeneratorTemplate.create(generatorTemplate)
    .then((o) => {
      sgtDBInstance = o;
      return Promise.all([
        Collector.create(collector1),
        Collector.create(collector2),
        Collector.create(collector3),
      ]);
    })
    .then((collectors) => {
      collector1 = collectors[ZERO];
      collector2 = collectors[ONE];
      collector3 = collectors[TWO];
      return CollectorGroup.create(collectorGroup1);
    })
    .then((cg) => {
      collectorGroup1 = cg;
      return CollectorGroup.create(collectorGroup2);
    })
    .then((cg) => {
      collectorGroup2 = cg;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    generator.collectorGroup = collectorGroup1.name;
    Generator.createWithCollectors(generator)
    .then((o) => {
      generatorDBInstance = o;
      return collectorGroup1.addCollectors([collector1]);
    })
    .then(() => done())
    .catch(done);
  });

  // delete generator after each test
  afterEach(() => tu.forceDelete(tu.db.Generator, testStartTime));
  after(u.forceDelete);
  after(gtUtil.forceDelete);

  it('update without collectors field should preserve the collectors', (done) => {
    generatorDBInstance
    .updateWithCollectors({ name: 'New_Name' })
    .then((o) => {
      expect(o.name).to.equal('New_Name');

      // check collector is still there
      expect(Array.isArray(o.collectorGroup.collectors)).to.be.true;
      expect(o.collectorGroup.collectors.length).to.equal(ONE);
      expect(o.collectorGroup.collectors[0].name).to.equal(collector1.name);
      done();
    })
    .catch(done);
  });

  it('ok: update to add new collectors', (done) => {
    collectorGroup2.setCollectors([collector2, collector3])
    .then(() => generatorDBInstance.updateWithCollectors({
      collectorGroup: collectorGroup2.name,
    }))
    .then((o) => {
      expect(Array.isArray(o.collectorGroup.collectors)).to.be.true;
      expect(o.collectorGroup.collectors.length).to.equal(TWO);
      const collectorNames = o.collectorGroup.collectors.map((collector) => collector.name);
      expect(collectorNames).to.contain(collector2.name);
      expect(collectorNames).to.contain(collector3.name);
      done();
    })
    .catch(done);
  });

  it('404 error for request body with nonexistent collectorGroup', (done) => {
    generatorDBInstance.updateWithCollectors({ collectorGroup: 'iDontExist' })
    .then((o) => done(new Error('Expected ResourceNotFoundError, received', o)))
    .catch((err) => {
      expect(err.status).to.equal(u.NOT_FOUND_STATUS_CODE);
      expect(err.name).to.equal('ResourceNotFoundError');
      expect(err.resourceType).to.equal('CollectorGroup');
      expect(err.resourceKey).to.deep.equal('iDontExist');
      done();
    });
  });

  describe('isActive validation', () => {
    function testUpdateWithCollectors(changes) {
      const initialValues = {
        collectors: changes.collectors.initial,
        isActive: changes.isActive.initial,
      };
      const updates = {
        collectors: changes.collectors.update,
        isActive: changes.isActive.update,
      };

      Object.keys(updates).forEach((key) => {
        if (updates[key] === undefined) delete updates[key];
      });

      let expectedCollectors = initialValues.collectors;
      let expectedIsActive = initialValues.isActive;
      if (changes.expectSuccess) {
        if (updates.collectors !== undefined) {
          expectedCollectors = updates.collectors;
        }

        if (updates.isActive !== undefined) {
          expectedIsActive = updates.isActive;
        }
      }

      let promise = Promise.resolve()
      .then(() => Generator.findByPk(generatorDBInstance.id))
      .then((gen) => gen.update(initialValues, { validate: false }))
      .then(() => Generator.findByPk(generatorDBInstance.id))
      .then((gen) => gen.collectorGroup.setCollectors(initialValues.collectors))
      .then(() => {
        if (updates.collectors) {
          updates.collectorGroup = collectorGroup2.name;
          return collectorGroup2.setCollectors(updates.collectors);
        }
      })
      .then(() => Generator.findByPk(generatorDBInstance.id))
      .then((gen) => gen.updateWithCollectors(updates));

      if (changes.expectSuccess) {
        promise = promise.should.eventually.be.fulfilled;
      } else {
        promise = promise.should.eventually.be.rejectedWith(
          'isActive can only be turned on if a collector group is specified ' +
          'with at least one collector.'
        );
      }

      return promise.then(() => Generator.findByPk(generatorDBInstance.id))
      .then((gen) => {
        expect(gen.collectorGroup.collectors).to.have.lengthOf(expectedCollectors.length);
        expect(gen.isActive).to.equal(expectedIsActive);
      });
    }

    it('existing collectors, set isActive', () =>
      testUpdateWithCollectors({
        collectors: { initial: [collector1], },
        isActive: { initial: false, update: true, },
        expectSuccess: true,
      })
    );

    it('existing collectors, unset isActive', () =>
      testUpdateWithCollectors({
        collectors: { initial: [collector1], },
        isActive: { initial: true, update: false, },
        expectSuccess: true,
      })
    );

    it('no existing collectors, set isActive', () =>
      testUpdateWithCollectors({
        collectors: { initial: [], },
        isActive: { initial: false, update: true, },
        expectSuccess: false,
      })
    );

    it('no existing collectors, unset isActive', () =>
      testUpdateWithCollectors({
        collectors: { initial: [], },
        isActive: { initial: true, update: false, },
        expectSuccess: true,
      })
    );

    it('isActive=false, set collectors', () =>
      testUpdateWithCollectors({
        isActive: { initial: false },
        collectors: { initial: [], update: [collector1] },
        expectSuccess: true,
      })
    );

    it('isActive=true, set collectors', () =>
      testUpdateWithCollectors({
        isActive: { initial: true },
        collectors: { initial: [], update: [collector1] },
        expectSuccess: true,
      })
    );

    it('set collectors, set isActive', () =>
      testUpdateWithCollectors({
        collectors: { initial: [], update: [collector1] },
        isActive: { initial: false, update: true, },
        expectSuccess: true,
      })
    );

    it('set collectors, unset isActive', () =>
      testUpdateWithCollectors({
        collectors: { initial: [], update: [collector1] },
        isActive: { initial: true, update: false, },
        expectSuccess: true,
      })
    );

  });
});
