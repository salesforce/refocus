/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/start.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/collectors/start';
const collectorConfig = require('../../../../config/collectorConfig');
const getWritersPath = '/v1/collectors/{key}/writers';
const Collector = tu.db.Collector;
const expect = require('chai').expect;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const sgUtils = require('../generators/utils');
const sinon = require('sinon');
const gtUtil = sgUtils.gtUtil;

describe('tests/api/v1/collectors/start.js >', () => {
  let token;
  let tokenOfSecondUser;
  let user;
  const secondUserName = 'userTwo';
  const defaultCollector = u.getCollectorToCreate();
  defaultCollector.version = '0.0.1';

  let generator1;
  let generator2;
  let collector1;
  const generatorTemplate = gtUtil.getGeneratorTemplate();

  before((done) => {
    tu.createUserAndToken()
    .then((_user) => {
      user = _user.user;
      token = _user.token;
      return tu.createUser(secondUserName);
    })
    .then(() => tu.createTokenFromUserName(secondUserName))
    .then((_token) => {
      tokenOfSecondUser = _token;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    sgUtils.createGeneratorAspects()
    .then(() => GeneratorTemplate.create(generatorTemplate))
    .then(() => {
      const gen1 = sgUtils.getGenerator();
      gen1.name += 'generator-1';
      gen1.createdBy = user.id;
      gen1.currentCollector = u.getCollectorToCreate().name;

      const gen2 = sgUtils.getGenerator();
      gen2.name += 'generator-2';
      gen2.createdBy = user.id;
      gen2.currentCollector = u.getCollectorToCreate().name;
      return Generator.bulkCreate([gen1, gen2]);
    })
    .then((generators) => {
      generator1 = generators[0];
      generator2 = generators[1];
      return Collector.create(u.getCollectorToCreate());
    })
    .then((c) => {
      collector1 = c;
      return c.addPossibleGenerators([generator1, generator2]);
    })
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  describe('if the collector is registered and status is STOPPED >', () => {
    it('if the user is among the writers, start the collector ' +
      'and return the expected response', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(defaultCollector)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.status).to.equal('Running');
        expect(res.body.token).to.be.an('string');
        expect(res.body.collectorConfig).to.include(collectorConfig);
        expect(res.body.collectorConfig.status).to.include('Running');
        expect(res.body.generatorsAdded).to.have.lengthOf(2);
        const sg1 = res.body.generatorsAdded.filter((gen) =>
          gen.name === generator1.name)[0];
        const sg2 = res.body.generatorsAdded.filter((gen) =>
          gen.name === generator2.name)[0];
        expect(sg1.id).to.include(generator1.id);
        expect(sg1.GeneratorCollectors).to.equal(undefined);
        expect(sg1.possibleCollectors).to.equal(undefined);
        expect(sg2.GeneratorCollectors).to.equal(undefined);
        expect(sg2.possibleCollectors).to.equal(undefined);
        expect(res.body.generatorsAdded[0].aspects[0])
          .to.contain.property('name', 'temperature');
        return done();
      });
    });

    it('reject if the user is NOT among the writers', (done) => {
      api.post(path)
      .set('Authorization', tokenOfSecondUser)
      .send(defaultCollector)
      .expect(constants.httpStatus.FORBIDDEN)
      .expect((res) => {
        expect(res.body.errors[0].description)
          .to.equal('Authentication Failed');
      })
      .end(done);
    });
  });

  describe('with unassigned and active generators available', () => {
    let clock;
    const now = Date.now();

    // used to make collector alive
    before(() => {
      clock = sinon.useFakeTimers(now);
    });

    afterEach(() => clock.restore());

    it('starting collector assigns this collector to unassigned and active ' +
      'generators with this possible collector', (done) => {
      let genInst;
      const gen3 = sgUtils.getGenerator();
      gen3.name += 'generator-3';
      gen3.createdBy = user.id;
      sgUtils.createSGtoSGTMapping(generatorTemplate, gen3);

      Generator.create(gen3)
      .then((createdGen) => { // create gen3
        genInst = createdGen;

        // add collector1 to the possible list of collectors of gen3
        return createdGen.addPossibleCollectors(collector1);
      })
      .then(() => genInst.reload())
      .then((updatedInst) => {
        // check gen3 current collector is null
        expect(updatedInst.currentCollector).to.be.equal(null);
        return updatedInst.update({ isActive: true }); // make gen3 active
      })
      .then(() => {
        api.post(path)
        .set('Authorization', token)
        .send(defaultCollector)
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.status).to.equal('Running');
          return Generator.find({ where: { name: gen3.name } })
          .then((gen) => {
            // gen3 currentCollector set to defaultCollector
            expect(gen.currentCollector).to.be.equal(defaultCollector.name);
            return done();
          })
          .catch(done);
        });
      })
      .catch(done);
    });
  });

  it('reject when the user token is invalid', (done) => {
    api.post(path)
    .set('Authorization', 'iDontExist')
    .send({})
    .expect(constants.httpStatus.FORBIDDEN)
    .expect((res) => {
      expect(res.body.errors[0].description)
        .to.equal('Authentication Failed');
    })
    .end(done);
  });

  // need token id to revoke it
  it('reject when the user token is revoked');

  it('if the collector is not registered, throw an error.', (done) => {
    const _collector = u.getCollectorToCreate();
    _collector.name = 'unregisteredCollector';
    _collector.registered = false;
    Collector.create(_collector)
    .then(() => {
      api.post(path)
      .set('Authorization', token)
      .send(_collector)
      .expect(constants.httpStatus.FORBIDDEN)
      .end(done);
    });
  });

  describe('if the collector is registered >', () => {
    it('reject if the status is PAUSED', (done) => {
      const _collector = u.getCollectorToCreate();
      _collector.name = 'PausedCollector';

      /*
       * If change from default status Stopped to Paused, will throw err.
       * Thus create new collector instead.
       */
      _collector.status = 'Paused';
      Collector.create(_collector)
      .then((c) => {
        api.post(path.replace('{key}', c.id))
        .set('Authorization', token)
        .send(_collector)
        .expect(constants.httpStatus.FORBIDDEN)
        .end(done);
      });
    });

    it('reject if the status is RUNNING', (done) => {
      const _collector = u.getCollectorToCreate();
      _collector.name = 'runningCollector';
      _collector.status = 'Running';
      Collector.create(_collector)
      .then(() => {
        api.post(path)
        .set('Authorization', token)
        .send(_collector)
        .expect(constants.httpStatus.FORBIDDEN)
        .end(done);
      });
    });
  });

  describe('if collector not found >', () => {
    before(() => tu.toggleOverride('returnUser', true));
    after(() => tu.toggleOverride('returnUser', false));

    const _collector = u.getCollectorToCreate();
    _collector.name = 'newCollector';

    it('create a new collector record with registered=true ' +
      'and status=RUNNING, and return the expected response', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(_collector)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.status).to.equal('Running');
        expect(res.body.token).to.be.an('string');
        expect(res.body.collectorConfig).to.include(collectorConfig);
        expect(res.body.collectorConfig.status).to.include('Running');
        expect(res.body.generatorsAdded).to.have.lengthOf(0);
        return done();
      });
    });

    it('created collector has the expected writer', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(_collector)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        api.get(getWritersPath.replace('{key}', res.body.id))
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.length).to.equal(1);
          expect(res.body[0].id).to.equal(user.id);
          return done();
        });
      });
    });
  });
});
