/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/stop.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const Promise = require('bluebird');
supertest.Test.prototype.endAsync = Promise.promisify(supertest.Test
  .prototype.end);
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const stopPath = '/v1/collectors/{key}/stop';
const expect = require('chai').expect;
const Collector = tu.db.Collector;
const Generator = tu.db.Generator;
const CollectorGroup = tu.db.CollectorGroup;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const sgUtils = require('../generators/utils');
const gtUtil = sgUtils.gtUtil;
const sinon = require('sinon');

describe('tests/api/v1/collectors/stop.js >', () => {
  let token;
  let user;

  let generator1;
  let collector1;
  let collectorGroup1;
  const generatorTemplate = gtUtil.getGeneratorTemplate();
  const collectorOneName = u.getCollectorToCreate().name + '-One';
  let cg1 = { name: `${tu.namePrefix}-cg1`, description: 'test' };

  before((done) => {
    tu.createUserAndToken()
    .then((_user) => {
      user = _user.user;
      token = _user.token;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    sgUtils.createGeneratorAspects()
    .then(() => CollectorGroup.create(cg1))
    .then((cg) => collectorGroup1 = cg)
    .then(() => GeneratorTemplate.create(generatorTemplate))
    .then(() => {
      const gen = sgUtils.getGenerator();
      gen.name += 'generator-1';
      gen.createdBy = user.id;
      gen.currentCollector = collectorOneName;
      sgUtils.createSGtoSGTMapping(generatorTemplate, gen);

      // create generator1
      return Generator.create(gen);
    })
    .then((generator) => {
      generator1 = generator;
      const collectorToCreate = u.getCollectorToCreate();
      collectorToCreate.name = collectorOneName;
      collectorToCreate.status = 'Running';

      // create collector1 with status=Running
      return Collector.create(collectorToCreate);
    })
    .then((c) => {
      collector1 = c;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('stop collector sets status to Stopped', (done) => {
    expect(collector1.status).to.equal('Running');
    api.post(stopPath.replace('{key}', collector1.id))
    .set('Authorization', token)
    .send({})
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.status).to.equal('Stopped');
      done();
    });
  });

  describe('reassign generator', () => {
    let collector2;
    let clock;
    const now = Date.now();

    // used to make collector alive
    before(() => {
      clock = sinon.useFakeTimers(now);
    });

    beforeEach((done) => {
      collector1.update({ lastHeartbeat: now }) // make collector1 alive

      // add collector1 to generator1 possible list of collectors
      .then(() => collectorGroup1.addCollectors([collector1]))
      .then(() => collectorGroup1.addGenerators([generator1]))
      .then(() => generator1.reload())

      // this should set currentCollector to collector1
      .then(() => generator1.update({ isActive: true }))
      .then((updatedGen) => {
        generator1 = updatedGen;

        // create collector2
        const collectorToCreate = u.getCollectorToCreate();
        collectorToCreate.status = 'Running';
        collectorToCreate.name += '-Two';
        collectorToCreate.lastHeartbeat = now; // will make collector2 alive
        return Collector.create(collectorToCreate);
      })
      .then((createdColl) => {
        collector2 = createdColl;

        // add collector2 to possible collectors of generator1
        return collectorGroup1.addCollectors([collector2]);
      })
      .then(() => generator1.reload())
      .then(() => done())
      .catch(done);
    });

    afterEach(() => clock.restore());

    it('stop collector, reassigns corresponding active generator to another ' +
      'running collector', (done) => {
      expect(collector1.status).to.equal('Running');
      expect(generator1.currentCollector.name).to.be.equal(collector1.name);
      api.post(stopPath.replace('{key}', collector1.id))
      .set('Authorization', token)
      .send({})
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.status).to.equal('Stopped');
        return Generator.find({ where: { name: generator1.name } })
        .then((gen) => {
          expect(gen.currentCollector.name).to.be.equal(collector2.name);
          return done();
        })
        .catch(done);
      });
    });
  });
});
