/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/pause.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const Promise = require('bluebird');
supertest.Test.prototype.endAsync = Promise.promisify(supertest.Test
  .prototype.end);
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const pausePath = '/v1/collectors/{key}/pause';
const expect = require('chai').expect;
const Collector = tu.db.Collector;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const sgUtils = require('../generators/utils');
const gtUtil = sgUtils.gtUtil;
const sinon = require('sinon');

describe('tests/api/v1/collectors/pause.js >', () => {
  let token;
  let user;

  let generator1;
  let collector1;
  const generatorTemplate = gtUtil.getGeneratorTemplate();
  const collectorOneName = u.getCollectorToCreate().name + '-One';

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

  it('pause collector should set status to Paused', (done) => {
    expect(collector1.status).to.equal('Running');
    api.post(pausePath.replace('{key}', collector1.id))
    .set('Authorization', token)
    .send({})
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.status).to.equal('Paused');
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

      // add collector1 to possible collectors of generator1
      .then(() => generator1.addPossibleCollectors(collector1))
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
        return generator1.addPossibleCollectors(createdColl);
      })
      .then(() => generator1.reload())
      .then((updatedGen) => {
        generator1 = updatedGen;
        done();
      })
      .catch(done);
    });

    afterEach(() => clock.restore());

    it('pause collector, reassigns corresponding active generator to another ' +
      'running collector', (done) => {
      expect(collector1.status).to.equal('Running');
      expect(generator1.currentCollector).to.be.equal(collector1.name);
      api.post(pausePath.replace('{key}', collector1.id))
      .set('Authorization', token)
      .send({})
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.status).to.equal('Paused');
        return Generator.find({ where: { name: generator1.name } })
        .then((gen) => {
          expect(gen.currentCollector).to.be.equal(collector2.name);
          return done();
        })
        .catch(done);
      });
    });
  });
});
