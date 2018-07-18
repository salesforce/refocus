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
    localGenerator.possibleCollectors = [
      collector1.name,
      collector2.name,
      collector3.name,
    ];
    localGenerator.currentCollector = collector1.name;

    Generator.createWithCollectors(localGenerator)
    .then((o) => {
      expect(o.possibleCollectors.length).to.equal(THREE);
      const collectorNames = o.possibleCollectors.map((collector) => collector.name);
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
      expect(o.isActive).to.equal(false);
      expect(o.generatorTemplate.name).to.equal('refocus-ok-template');
      expect(o.generatorTemplate.version).to.equal('1.0.0');
      expect(typeof o.getWriters).to.equal('function');
      expect(typeof o.getPossibleCollectors).to.equal('function');
      expect(o.currentCollector).to.equal(collector1.name);
      done();
    })
    .catch(done);
  });

  it('400 error with duplicate collectors in request body', (done) => {
    const localGenerator = JSON.parse(JSON.stringify(generator));
    localGenerator.possibleCollectors = [collector1.name, collector1.name];
    Generator.createWithCollectors(localGenerator)
    .then((o) => done(new Error('Expected DuplicateCollectorError, received', o)))
    .catch((err) => {
      expect(err.status).to.equal(u.BAD_REQUEST_STATUS_CODE);
      expect(err.name).to.equal('DuplicateCollectorError');
      expect(err.resourceType).to.equal('Collector');
      expect(err.resourceKey).to.deep.equal(localGenerator.possibleCollectors);
      done();
    });
  });

  it('404 error for request body with an non-existant collector', (done) => {
    const localGenerator = JSON.parse(JSON.stringify(generator));
    localGenerator.possibleCollectors = ['iDontExist'];
    Generator.createWithCollectors(localGenerator)
    .then((o) => done(new Error('Expected ResourceNotFoundError, received', o)))
    .catch((err) => {
      expect(err.status).to.equal(u.NOT_FOUND_STATUS_CODE);
      expect(err.name).to.equal('ResourceNotFoundError');
      expect(err.resourceType).to.equal('Collector');
      expect(err.resourceKey).to.deep.equal(localGenerator.possibleCollectors);
      done();
    });
  });

  it('404 error for request body with an existing and a ' +
    'non-existant collector', (done) => {
    const localGenerator = JSON.parse(JSON.stringify(generator));
    localGenerator.possibleCollectors = [collector1.name, 'iDontExist'];
    Generator.createWithCollectors(localGenerator)
    .then((o) => done(new Error('Expected ResourceNotFoundError, received', o)))
    .catch((err) => {
      expect(err.status).to.equal(u.NOT_FOUND_STATUS_CODE);
      expect(err.name).to.equal('ResourceNotFoundError');
      expect(err.resourceType).to.equal('Collector');
      expect(err.resourceKey).to.deep.equal(localGenerator.possibleCollectors);
      done();
    });
  });

  describe('isActive validation', () => {
    it('collectors specified, isActive=false', () => {
      const gen = u.getGenerator();
      gen.possibleCollectors = [collector1.name, collector2.name];
      gen.isActive = false;

      return Generator.createWithCollectors(gen)
        .should.eventually.be.fulfilled;
    });

    it('collectors specified, isActive=true', () => {
      const gen = u.getGenerator();
      gen.possibleCollectors = [collector1.name, collector2.name];
      gen.isActive = true;

      return Generator.createWithCollectors(gen)
        .should.eventually.be.fulfilled;
    });

    it('no collectors, isActive=false', () => {
      const gen = u.getGenerator();
      gen.isActive = false;

      return Generator.createWithCollectors(gen)
        .should.eventually.be.fulfilled;
    });

    it('no collectors, isActive=true (validation fails)', () => {
      const gen = u.getGenerator();
      gen.isActive = true;

      return Generator.createWithCollectors(gen)
      .should.eventually.be.rejectedWith(
        'isActive can only be turned on if at least one collector is specified.'
      )

      // make sure that when validation fails the generator is not created and
      // the collectors association is not setup
      .then(() => Generator.findOne({ where: { name: gen.name } }))
      .should.eventually.not.exist
      .then(() => tu.db.GeneratorCollectors.findAll(
        { where: { collectorId: collector1.id } }
      ))
      .should.eventually.be.empty;
    });
  });
});
