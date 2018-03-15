/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/generator/find.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const gtUtil = u.gtUtil;
const Aspect = tu.db.Aspect;
const Generator = tu.db.Generator;
const Collector = tu.db.Collector;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const GlobalConfig = tu.db.GlobalConfig;
const cryptUtils = require('../../../../utils/cryptUtils');
const constants = require('../../../../db/constants');

describe('tests/db/model/generator/find.js >', () => {
  const generator = u.getGenerator();
  const g2 = u.getGeneratorWithSubjectArray();
  const generatorTemplate = gtUtil.getGeneratorTemplate();
  const gtWithEncryption = gtUtil.getGeneratorTemplate();
  gtWithEncryption.name = 'gtWithEncryption';
  gtWithEncryption.contextDefinition.password.encrypted = true;
  gtWithEncryption.contextDefinition.token.encrypted = true;

  const gtWithRequiredContextDef = gtUtil.getGeneratorTemplate();
  gtWithRequiredContextDef.name = 'gtWithRequiredContextDef';
  gtWithRequiredContextDef.contextDefinition.newRequireField = {
    required: true,
    description: 'New field for contextDefinition',
  };

  let generatorDBInstance;
  let g2DBInstance;
  let sgtDBInstance;
  const collectorObj1 = {
    name: 'collector1',
    version: '1.0.0',
  };
  const collectorObj2 = {
    name: 'collector2',
    version: '1.0.0',
  };
  before((done) => {
    u.createGeneratorAspects()
    .then(() => u.createGeneratorSubjects())
    .then(() => GeneratorTemplate.create(gtWithEncryption))
    .then(() => GeneratorTemplate.create(gtWithRequiredContextDef))
    .then(() => GeneratorTemplate.create(generatorTemplate))
    .then((o) => {
      sgtDBInstance = o;
      return Generator.create(generator);
    })
    .then((o) => {
      generatorDBInstance = o;
      return Generator.create(g2);
    })
    .then((o) => {
      g2DBInstance = o;
      return Collector.create(collectorObj1);
    })
    .then((c) => {
      generatorDBInstance.addCollector(c.id);
      g2DBInstance.addCollector(c.id);
      return Collector.create(collectorObj2);
    })
    .then((c) => {
      generatorDBInstance.addCollector(c.id);
      g2DBInstance.addCollector(c.id);
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(gtUtil.forceDelete);

  it.skip('updateForHeartbeat - subject query', (done) => {
    Generator.findById(generatorDBInstance.id)
    .then((g) => {
      expect(g.get().aspects).to.be.an('array')
      .that.includes('Temperature')
      .that.includes('Weather');
      expect(g.get().subjectQuery).to.equal('?absolutePath=Foo.*');
      return g;
    })
    .then((g) => g.updateForHeartbeat())
    .then((g) => {
      const asp = g.get().aspects;
      expect(asp).to.be.an('array');
      expect(asp[0]).to.contain.property('name', 'Temperature');
      expect(asp[1]).to.contain.property('name', 'Weather');
      const sub = g.get().subjects;
      expect(sub).to.be.an('array');
      expect(sub[0]).to.contain.property('absolutePath', 'foo.bar');
      expect(sub[1]).to.contain.property('absolutePath', 'foo.baz');
      done();
    })
    .catch(done);
  });

  it('updateForHeartbeat - array of subjects', (done) => {
    Generator.findById(g2DBInstance.id)
    .then((g) => {
      expect(g.get().aspects).to.be.an('array').to.have.lengthOf(3)
      .that.includes('Temperature')
      .that.includes('Weather')
      .that.includes('Humidity');
      expect(g.get().subjects).to.be.an('array')
      .that.includes('foo.bar')
      .that.includes('foo.baz');
      return g;
    })
    .then((g) => g.updateForHeartbeat())
    .then((g) => {
      const asp = g.get().aspects;
      expect(asp).to.be.an('array').to.have.lengthOf(2);
      expect(asp[0]).to.contain.property('name', 'Temperature');
      expect(asp[1]).to.contain.property('name', 'Weather');
      const sub = g.get().subjects;
      expect(sub).to.be.an('array');
      expect(sub[0]).to.contain.property('absolutePath', 'foo.bar');
      expect(sub[1]).to.contain.property('absolutePath', 'foo.baz');
      done();
    })
    .catch(done);
  });
});
