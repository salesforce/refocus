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

  it('findForHeartbeat', (done) => {
    Generator.findForHeartbeat({
      where: { id: [generatorDBInstance.id, g2DBInstance.id] },
    })
    .then((res) => {
      expect(res).to.be.an('array').to.have.lengthOf(2);
      expect(res[0].aspects[0]).to.have.property('name', 'temperature');

      // Make sure we have the full SGT record here, not just the name/version
      expect(res[0].generatorTemplate).to.have.property('connection');
      expect(res[0].generatorTemplate).to.have.property('description');
      expect(res[0].generatorTemplate).to.have.property('author');
      expect(res[0].generatorTemplate).to.have.property('transform');
      done();
    })
    .catch(done);
  });
});
