/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/generator/createWithCollectors.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
require('chai').use(require('chai-as-promised')).should();
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const Collector = tu.db.Collector;
const CollectorGroup = tu.db.CollectorGroup;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const THREE = 3;
const testStartTime = new Date();

describe('tests/db/model/generator/createWithCollectors.js >', () => {
  let collector1 = { name: 'hello', version: '1.0.0' };
  let collector2 = { name: 'beautiful', version: '1.0.0' };
  let collector3 = { name: 'world', version: '1.0.0' };

  let userInst;
  const generator = JSON.parse(JSON.stringify(u.getGenerator()));
  const generatorTemplate = gtUtil.getGeneratorTemplate();

  let collectorGroup1 = { name: `${tu.namePrefix}-cg1`, description: 'test' };

  before((done) => {
    tu.createUser('GeneratorOwner')
    .then((user) => {
      generator.createdBy = user.id;
      userInst = user;
      return GeneratorTemplate.create(generatorTemplate);
    })
    .then(() => Promise.all([
      Collector.create(collector1),
      Collector.create(collector2),
      Collector.create(collector3),
    ]))
    .then((collectors) => {
      collector1 = collectors[ZERO];
      collector2 = collectors[ONE];
      collector3 = collectors[TWO];
      return CollectorGroup.create(collectorGroup1);
    })
    .then((cg) => {
      collectorGroup1 = cg;
      done();
    })
    .catch(done);
  });

  // delete generator after each test
  afterEach(() => tu.forceDelete(tu.db.Generator, testStartTime));
  after(u.forceDelete);
  after(gtUtil.forceDelete);

  // identical response as to Generator.create()
  it('correct profile access field name', () => {
    expect(Generator.getProfileAccessField()).to.equal('generatorAccess');
  });

  it('ok, create with all fields', (done) => {
    const localGenerator = JSON.parse(JSON.stringify(generator));
    localGenerator.collectorGroup = collectorGroup1.name;
    localGenerator.isActive = true;

    // make collector1 alive
    collectorGroup1.setCollectors([collector1, collector2, collector3])
    .then(() => collector1.update({ status: 'Running', lastHeartbeat: Date.now() }))
    .then(() => Generator.createWithCollectors(localGenerator))
    .then((o) => {
      expect(o.collectorGroup.collectors.length).to.equal(THREE);
      const collectorNames =
        o.collectorGroup.collectors.map((collector) => collector.name);
      expect(collectorNames).to.contain(collector1.name);
      expect(collectorNames).to.contain(collector2.name);
      expect(collectorNames).to.contain(collector3.name);

      // standard generator check
      expect(o.user.name).to.equal(userInst.name);
      expect(o.id).to.not.equal(undefined);
      expect(o.name).to.equal(generator.name);
      expect(o.description).to.equal(generator.description);
      expect(o.tags).to.deep.equal(generator.tags);
      expect(o.context).to.deep.equal(generator.context);
      expect(o.helpUrl).to.equal(generator.helpUrl);
      expect(o.helpEmail).to.equal(generator.helpEmail);
      expect(o.createdBy).to.equal(generator.createdBy);
      expect(o.isActive).to.equal(true);
      expect(o.generatorTemplate.name).to.equal('refocus-ok-template');
      expect(o.generatorTemplate.version).to.equal('1.0.0');
      expect(typeof o.getWriters).to.equal('function');
      expect(typeof o.getCollectorGroup).to.equal('function');
      expect(o.currentCollector.name).to.equal(collector1.name);
      expect(o.currentCollector.id).to.equal(collector1.id);
      done();
    })
    .catch(done);
  });

  it('404 error for request body with a non-existant collectorGroup', (done) => {
    const localGenerator = JSON.parse(JSON.stringify(generator));
    localGenerator.collectorGroup = 'iDontExist';
    Generator.createWithCollectors(localGenerator)
    .then((o) => done(new Error('Expected ResourceNotFoundError, ' +
      'received', o)))
    .catch((err) => {
      expect(err.status).to.equal(u.NOT_FOUND_STATUS_CODE);
      expect(err.name).to.equal('ResourceNotFoundError');
      expect(err.resourceType).to.equal('CollectorGroup');
      expect(err.resourceKey).to.deep.equal(localGenerator.collectorGroup);
      done();
    });
  });

  describe('isActive validation', () => {
    it('collectors specified, isActive=false', () => {
      const gen = u.getGenerator();
      gen.collectorGroup = collectorGroup1.name;
      gen.isActive = false;

      return collectorGroup1.setCollectors([collector1, collector2])
        .then(() => Generator.createWithCollectors(gen))
        .should.eventually.be.fulfilled;
    });

    it('collectors specified, isActive=true', () => {
      const gen = u.getGenerator();
      gen.collectorGroup = collectorGroup1.name;
      gen.isActive = true;

      return collectorGroup1.setCollectors([collector1, collector2])
        .then(() => Generator.createWithCollectors(gen))
        .should.eventually.be.fulfilled;
    });

    it('no collectors, isActive=false', () => {
      const gen = u.getGenerator();
      gen.collectorGroup = collectorGroup1.name;
      gen.isActive = false;

      return collectorGroup1.setCollectors([])
        .then(() => Generator.createWithCollectors(gen))
        .should.eventually.be.fulfilled;
    });

    it('no collectors, isActive=true (validation fails)', () => {
      const gen = u.getGenerator();
      gen.collectorGroup = collectorGroup1.name;
      gen.isActive = true;

      return collectorGroup1.setCollectors([])
      .then(() => Generator.createWithCollectors(gen))
      .should.eventually.be.rejectedWith(
        'isActive can only be turned on if a collector group is specified ' +
        'with at least one collector.'
      )

      // make sure that when validation fails the generator is not created
      .then(() => Generator.findOne({ where: { name: gen.name } }))
      .should.eventually.not.exist;
    });
  });
});
