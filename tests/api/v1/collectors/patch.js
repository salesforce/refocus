/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/patch.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const sinon = require('sinon');
const api = supertest(require('../../../../express').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const gu = require('../generators/utils');
const gtu = require('../generatorTemplates/utils');
const path = '/v1/collectors';
const Collector = tu.db.Collector;
const CollectorGroup = tu.db.CollectorGroup;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const expect = require('chai').expect;
const jwtUtil = require('../../../../utils/jwtUtil');

describe('tests/api/v1/collectors/patch.js >', () => {
  let i = 0;
  let token;
  let collectorToken;
  let clock;
  const now = Date.now();

  let collector1 = u.getCollectorToCreate();
  let collector2 = u.getCollectorToCreate();
  let collector3 = u.getCollectorToCreate();
  collector1.name += 1;
  collector2.name += 2;
  collector3.name += 3;
  collector1.status = 'Running';
  collector2.status = 'Running';
  collector3.status = 'Running';
  collector1.lastHeartbeat = now;
  collector2.lastHeartbeat = now;
  collector3.lastHeartbeat = now;

  let collectorGroup1 = { name: `${tu.namePrefix}-cg1`, description: 'test' };
  let collectorGroup2 = { name: `${tu.namePrefix}-cg2`, description: 'test' };
  let collectorGroup3 = { name: `${tu.namePrefix}-cg3`, description: 'test' };
  collectorGroup1.collectors = [collector1.name];
  collectorGroup2.collectors = [collector2.name];
  collectorGroup3.collectors = [collector3.name];

  const gen1 = gu.getBasic({ name: 'gen1' });
  const gen2 = gu.getBasic({ name: 'gen2' });
  const gen3 = gu.getBasic({ name: 'gen3' });
  const generatorTemplate = gtu.getGeneratorTemplate();
  gu.createSGtoSGTMapping(generatorTemplate, gen1);
  gu.createSGtoSGTMapping(generatorTemplate, gen2);
  gu.createSGtoSGTMapping(generatorTemplate, gen3);
  gen1.isActive = true;
  gen2.isActive = true;
  gen3.isActive = true;
  gen1.collectorGroup = collectorGroup1.name;
  gen2.collectorGroup = collectorGroup2.name;
  gen3.collectorGroup = collectorGroup3.name;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Promise.all([
      Collector.create(collector1),
      Collector.create(collector2),
      Collector.create(collector3),
    ])
    .then(([c1]) => {
      collectorToken = jwtUtil.createToken(c1.name, tu.userName,
        { IsCollector: true });
      i = c1.id;
      done();
    })
    .catch(done);
  });

  beforeEach(() =>
    Promise.all([
      CollectorGroup.createCollectorGroup(collectorGroup1),
      CollectorGroup.createCollectorGroup(collectorGroup2),
      CollectorGroup.createCollectorGroup(collectorGroup3),
    ])
  );

  beforeEach(() =>
    GeneratorTemplate.create(generatorTemplate)
    .then(() => Promise.all([
      Generator.createWithCollectors(gen1),
      Generator.createWithCollectors(gen2),
      Generator.createWithCollectors(gen3)
        .then((g) => g.setCurrentCollector(null)),
    ]))
  );

  beforeEach(() => {
    clock = sinon.useFakeTimers(now);
  });

  afterEach(() => clock.restore());

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  it('update description', (done) => {
    api.patch(`${path}/${collector1.name}`)
    .set('Authorization', token)
    .send({ description: 'abcdefg' })
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      if (tu.gotExpectedLength(res.body, 0)) {
        throw new Error('expecting collector');
      }

      if (res.body.description !== 'abcdefg') {
        throw new Error('Incorrect description');
      }
    })
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('error, update version, user token provided instead of collector token',
  (done) => {
    api.patch(`${path}/${collector1.name}`)
    .set('Authorization', token)
    .send({ version: '1.1.1' })
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err, res) => {
      if (err) return done(err);
      expect(res.body.errors[0])
        .to.contain.property('description', 'Authentication Failed');
      done();
    });
  });

  it('ok, update version, collector token provided', (done) => {
    api.patch(`${path}/${collector1.name}`)
    .set('Authorization', collectorToken)
    .send({ version: '1.1.1' })
    .expect(constants.httpStatus.OK)
    .expect((res) => expect(res.body).to.have.property('version', '1.1.1'))
    .end((err) => err ? done(err) : done());
  });

  it('error - resource not found', (done) => {
    api.put(`${path}/doesNotExist`)
    .set('Authorization', token)
    .send({ description: 'abcdefg' })
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err /* , res */) => {
      done();
    });
  });

  it('ok: empty patch doesnt replace collector group', (done) => {
    api.patch(`${path}/${collector1.name}`)
    .set('Authorization', token)
    .send({ description: '...' })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const { collectorGroup } = res.body;
      expect(collectorGroup.name).to.equal(collectorGroup1.name);
      done();
    });
  });

  it('ok: PATCH collectorGroup', (done) => {
    api.patch(`${path}/${collector1.name}`)
    .set('Authorization', token)
    .send({ collectorGroup: collectorGroup2.name })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      const { collectorGroup } = res.body;
      expect(collectorGroup.name).to.equal(collectorGroup2.name);
      done();
    });
  });

  it('error: nonexistent collector group', (done) => {
    api.patch(`${path}/${collector1.name}`)
    .set('Authorization', token)
    .send({ collectorGroup: 'aaa' })
    .expect(constants.httpStatus.NOT_FOUND)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[0].message).to.equal('CollectorGroup "aaa" not found.');
      done();
    });
  });

  describe('generator assignment', () => {
    it('cg1 -> cg2: unassigns gens in old group', (done) => {
      Promise.all([
        Generator.findOne({ where: { name: gen1.name } }),
        Generator.findOne({ where: { name: gen2.name } }),
        Generator.findOne({ where: { name: gen3.name } }),
      ])
      .then(([gen1, gen2, gen3]) => {
        expect(gen1.currentCollector.name).to.equal(collector1.name);
        expect(gen2.currentCollector.name).to.equal(collector2.name);
        expect(gen3.currentCollector).to.not.exist;
      })
      .then(() => Promise.all([
        CollectorGroup.findOne({ where: { name: collectorGroup1.name } }),
      ]))
      .then(() => {
        api.patch(`${path}/${collector1.name}`)
        .set('Authorization', token)
        .send({ collectorGroup: collectorGroup2.name })
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          Promise.all([
            Generator.findOne({ where: { name: gen1.name } }),
            Generator.findOne({ where: { name: gen2.name } }),
            Generator.findOne({ where: { name: gen3.name } }),
          ])
          .then(([gen1, gen2, gen3]) => {
            expect(gen1.currentCollector).to.not.exist;
            expect(gen2.currentCollector.name).to.equal(collector2.name);
            expect(gen3.currentCollector).to.not.exist;
          })
          .then(() => done())
          .catch(done);
        });
      })
      .catch(done);
    });

    it('cg1 -> cg3: reassigns gens in old and new group', (done) => {
      Promise.all([
        Generator.findOne({ where: { name: gen1.name } }),
        Generator.findOne({ where: { name: gen2.name } }),
        Generator.findOne({ where: { name: gen3.name } }),
      ])
      .then(([gen1, gen2, gen3]) => {
        expect(gen1.currentCollector.name).to.equal(collector1.name);
        expect(gen2.currentCollector.name).to.equal(collector2.name);
        expect(gen3.currentCollector).to.not.exist;
      })
      .then(() => Promise.all([
        CollectorGroup.findOne({ where: { name: collectorGroup1.name } }),
      ]))
      .then(() => {
        api.patch(`${path}/${collector1.name}`)
        .set('Authorization', token)
        .send({ collectorGroup: collectorGroup3.name })
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          Promise.all([
            Generator.findOne({ where: { name: gen1.name } }),
            Generator.findOne({ where: { name: gen2.name } }),
            Generator.findOne({ where: { name: gen3.name } }),
          ])
          .then(([gen1, gen2, gen3]) => {
            expect(gen1.currentCollector).to.not.exist;
            expect(gen2.currentCollector.name).to.equal(collector2.name);
            expect(gen3.currentCollector.name).to.equal(collector1.name);
          })
          .then(() => done())
          .catch(done);
        });
      })
      .catch(done);
    });
  });
});
