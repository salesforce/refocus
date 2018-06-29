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
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Generator.create(generator)
    .then((o) => {
      generatorDBInstance = o;
      return o.addCollectors([collector1]);
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
      expect(Array.isArray(o.collectors)).to.be.true;
      expect(o.collectors.length).to.equal(ONE);
      done();
    })
    .catch(done);
  });

  it('ok: update to a collector that is already attached to the generator', (done) => {
    generatorDBInstance
    .updateWithCollectors({ collectors: [collector1.name] })
    .then((o) => {
      expect(Array.isArray(o.collectors)).to.be.true;
      expect(o.collectors.length).to.equal(ONE);
      done();
    })
    .catch(done);
  });

  it('ok: update to add new collectors', (done) => {
    generatorDBInstance
    .updateWithCollectors({ collectors: [collector2.name, collector3.name] })
    .then((o) => {
      expect(Array.isArray(o.collectors)).to.be.true;
      expect(o.collectors.length).to.equal(THREE);
      const collectorNames = o.collectors.map((collector) => collector.name);
      expect(collectorNames).to.contain(collector1.name);
      expect(collectorNames).to.contain(collector2.name);
      expect(collectorNames).to.contain(collector3.name);
      done();
    })
    .catch(done);
  });

  it('400 error with duplicate collectors in request body', (done) => {
    const _collectors = [collector1.name, collector1.name];
    generatorDBInstance.updateWithCollectors({ collectors: _collectors, })
    .then((o) => done(new Error('Expected DuplicateCollectorError, received', o)))
    .catch((err) => {
      expect(err.status).to.equal(u.BAD_REQUEST_STATUS_CODE);
      expect(err.name).to.equal('DuplicateCollectorError');
      expect(err.resourceType).to.equal('Collector');
      expect(err.resourceKey).to.deep.equal(_collectors);
      done();
    });
  });

  it('404 error for request body with an existing and a ' +
    'non-existant collector', (done) => {
    const _collectors = [collector1.name, 'iDontExist'];
    generatorDBInstance.updateWithCollectors({ collectors: _collectors, })
    .then((o) => done(new Error('Expected ResourceNotFoundError, received', o)))
    .catch((err) => {
      expect(err.status).to.equal(u.NOT_FOUND_STATUS_CODE);
      expect(err.name).to.equal('ResourceNotFoundError');
      expect(err.resourceType).to.equal('Collector');
      expect(err.resourceKey).to.deep.equal(_collectors);
      done();
    });
  });

  describe('isActive validation', () => {
    function doUpdateWithCollectors(changes) {
      const initialCollectorsValue = changes.collector.initial;
      const initialIsActiveValue = {
        isActive: changes.isActive.initial,
      };
      const updateValues = {
        collectors: changes.collector.update,
        isActive: changes.isActive.update,
      };

      Object.keys(updateValues).forEach((key) => {
        if (updateValues[key] === undefined) delete updateValues[key];
      });

      return Promise.resolve()
      .then(() => Generator.findById(generatorDBInstance.id))
      .then((gen) => gen.update(initialIsActiveValue, { validate: false }))
      .then(() => Generator.findById(generatorDBInstance.id))
      .then((gen) => gen.setCollectors(initialCollectorsValue))
      .then(() => Generator.findById(generatorDBInstance.id))
      .then((gen) => gen.updateWithCollectors(updateValues));
    }

    it('existing collectors, set isActive', () =>
      doUpdateWithCollectors({
        collector: { initial: [collector1], },
        isActive: { initial: false, update: true, },
      }).should.eventually.be.fulfilled
    );

    it('existing collectors, unset isActive', () =>
      doUpdateWithCollectors({
        collector: { initial: [collector1], },
        isActive: { initial: true, update: false, },
      }).should.eventually.be.fulfilled
    );

    it('no existing collectors, set isActive', () =>
      doUpdateWithCollectors({
        collector: { initial: [], },
        isActive: { initial: false, update: true, },
      }).should.eventually.be.rejectedWith(
        'isActive can only be turned on if at least one collector is specified.'
      )
    );

    it('no existing collectors, unset isActive', () =>
      doUpdateWithCollectors({
        collector: { initial: [], },
        isActive: { initial: true, update: false, },
      }).should.eventually.be.fulfilled
    );

    it('isActive=false, set collectors', () =>
      doUpdateWithCollectors({
        isActive: { initial: false },
        collector: { initial: [], update: [collector1.name] },
      }).should.eventually.be.fulfilled
    );

    it('isActive=true, set collectors', () =>
      doUpdateWithCollectors({
        isActive: { initial: true },
        collector: { initial: [], update: [collector1.name] },
      }).should.eventually.be.fulfilled
    );

    it('set collectors, set isActive', () =>
      doUpdateWithCollectors({
        collector: { initial: [], update: [collector1.name] },
        isActive: { initial: false, update: true, },
      }).should.eventually.be.fulfilled
    );

    it('set collectors, unset isActive', () =>
      doUpdateWithCollectors({
        collector: { initial: [], update: [collector1.name] },
        isActive: { initial: true, update: false, },
      }).should.eventually.be.fulfilled
    );

  });
});
