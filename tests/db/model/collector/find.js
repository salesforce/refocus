/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/collector/find.js
 */
'use strict';  // eslint-disable-line strict

const expect = require('chai').expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Collector = tu.db.Collector;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const sgUtils = require('../generator/utils');
const gtUtil = sgUtils.gtUtil;

describe('tests/db/model/collector/find.js >', () => {
  let userId;
  let collectorInst1;
  let collectorInst2;
  let collectorInst3;
  let generator1;
  let generator2;

  const generatorTemplate = gtUtil.getGeneratorTemplate();
  before((done) => {
    GeneratorTemplate.create(generatorTemplate)
    .then(() => tu.createUser('testUser'))
    .then((user) => {
      userId = user.id;
      const c = u.getCollectorObj();
      c.createdBy = user.id;
      return Collector.create(c);
    })
    .then((c) => {
      collectorInst1 = c;
      const gen = sgUtils.getGenerator();
      gen.name += 'generator-1';
      return Generator.create(gen);
    })
    .then((g1) => {
      generator1 = g1;
      const gen = sgUtils.getGenerator();
      gen.name += 'generator-2';
      return Generator.create(gen);
    })
    .then((g2) => {
      generator2 = g2;
      return collectorInst1.addPossibleGenerators([generator1, generator2]);
    })
    .then(() => {
      const c = u.getCollectorObj();
      c.name += 'secondCollector';
      c.status = 'Running';
      c.lastHeartbeat = new Date('2018-05-22T14:51:00');
      return Collector.create(c);
    })
    .then((c) => {
      collectorInst2 = c;
      const c3 = u.getCollectorObj();
      c3.name += 'thirdCollector';
      c3.status = 'Running';
      c3.lastHeartbeat = new Date('2018-05-22T14:51:05');
      return Collector.create(c3);
    })
    .then((c) => {
      collectorInst3 = c;
      return done();
    })
    .catch(done);
  });

  after(u.forceDelete);

  it('Find by Id', (done) => {
    Collector.findById(collectorInst1.id)
    .then((obj) => {
      expect(obj.name).to.be.equal('___Collector');
      expect(obj.registered).to.be.equal(true);
      expect(obj.status).to.be.equal('Stopped');
      expect(obj.description).to.be.equal(
        'This is a mock collector object for testing.'
      );
      expect(obj.helpEmail).to.be.equal('test@test.com');
      expect(obj.helpUrl).to.be.equal('http://test.com');
      expect(obj.host).to.be.equal('xxx-yyy-zzz.aaa.bbb.ccc.com');
      expect(obj.ipAddress).to.be.equal('123.456.789.012');
      expect(obj.createdBy).to.be.equal(userId);
      expect(obj.updatedAt).to.not.be.null;
      expect(obj.createdAt).to.not.be.null;
      done();
    })
    .catch(done);
  });

  it('Collector Instance with related generators', (done) => {
    collectorInst1.getPossibleGenerators()
    .then((generators) => {
      expect(generators).to.have.lengthOf(2);
      const sg1 = generators.filter((gen) =>
        gen.dataValues.name === generator1.name)[0].dataValues;
      const sg2 = generators.filter((gen) =>
        gen.dataValues.name === generator2.name)[0].dataValues;
      expect(sg1.id).to.include(generator1.id);
      expect(sg2.id).to.include(generator2.id);
      done();
    })
    .catch(done);
  });

  it('Collector Instance without generators ', (done) => {
    collectorInst2.getPossibleGenerators()
    .then((generators) => {
      expect(generators).to.have.lengthOf(0);
      done();
    })
    .catch(done);
  });

  it('Find, using where', (done) => {
    Collector.findOne({ where: { id: collectorInst1.id } })
    .then((obj) => {
      expect(obj.name).to.be.equal('___Collector');
      expect(obj.registered).to.be.equal(true);
      expect(obj.status).to.be.equal('Stopped');
      expect(obj.description).to.be.equal(
        'This is a mock collector object for testing.'
      );
      expect(obj.helpEmail).to.be.equal('test@test.com');
      expect(obj.helpUrl).to.be.equal('http://test.com');
      expect(obj.host).to.be.equal('xxx-yyy-zzz.aaa.bbb.ccc.com');
      expect(obj.ipAddress).to.be.equal('123.456.789.012');
      expect(obj.createdBy).to.be.equal(userId);
      expect(obj.updatedAt).to.not.be.null;
      expect(obj.createdAt).to.not.be.null;
      done();
    })
    .catch(done);
  });

  it('Find all', (done) => {
    Collector.findAll()
    .then((collectors) => {
      expect(collectors.length).to.be.equal(3);
      const obj = collectors.filter((c) => c.name === '___Collector')[0]
        .dataValues;
      expect(obj.name).to.be.equal('___Collector');
      expect(obj.registered).to.be.equal(true);
      expect(obj.status).to.be.equal('Stopped');
      expect(obj.description).to.be.equal(
        'This is a mock collector object for testing.'
      );
      expect(obj.helpEmail).to.be.equal('test@test.com');
      expect(obj.helpUrl).to.be.equal('http://test.com');
      expect(obj.host).to.be.equal('xxx-yyy-zzz.aaa.bbb.ccc.com');
      expect(obj.ipAddress).to.be.equal('123.456.789.012');
      expect(obj.osInfo).to.deep.equal({
        hostname: 'testHostname',
        username: 'testUsername',
      });
      expect(obj.processInfo).to.deep.equal({
        execPath: 'testExecPath',
        memoryUsage: {
          heapTotal: 1234,
          external: 5678,
        },
        version: 'v1',
        versions: { a: 'a', b: 'b' },
      });
      expect(obj.version).to.be.equal('1.0.0');
      expect(obj.createdBy).to.be.equal(userId);
      expect(obj.updatedAt).to.not.be.null;
      expect(obj.createdAt).to.not.be.null;
      done();
    })
    .catch(done);
  });

  it('scope = running', (done) => {
    Collector.scope('defaultScope', 'running').findAll()
    .then((collectors) => {
      expect(collectors).to.have.lengthOf(2);
      expect(collectors[0])
        .to.have.property('name', `${tu.namePrefix}CollectorsecondCollector`);
      expect(collectors[0]).to.have.property('status', 'Running');
      expect(collectors[1])
        .to.have.property('name', `${tu.namePrefix}CollectorthirdCollector`);
      expect(collectors[1]).to.have.property('status', 'Running');
      return done();
    })
    .catch(done);
  });
});
