/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectorGroups/patch.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const sinon = require('sinon');
const api = supertest(require('../../../../index').app);
const httpStatus = require('../../../../api/v1/constants').httpStatus;
const tu = require('../../../testUtils');
const u = require('./utils');
const gu = require('../generators/utils');
const gtu = require('../generatorTemplates/utils');
const Collector = tu.db.Collector;
const CollectorGroup = tu.db.CollectorGroup;
const Generator = tu.db.Generator;
const GeneratorTemplate = tu.db.GeneratorTemplate;
const expect = require('chai').expect;

describe('tests/api/v1/collectorGroups/patch.js >', () => {
  let user;
  let token;
  let token2;
  let collector1;
  let collector2;
  let collector3;
  let cg = { name: '' };
  let cg2;

  before((done) => {
    tu.createUserAndToken()
      .then((ut) => {
        user = ut.user;
        token = ut.token;
        return tu.createSecondUser();
      })
      .then((user2) => tu.createTokenFromUserName(user2.get('name')))
      .then((t) => (token2 = t))
      .then(() => done())
      .catch(done);
  });

  beforeEach(() => {
    collector1 = u.getCollectorToCreate();
    collector1.name += '1';
    Collector.create(collector1);
    collector2 = u.getCollectorToCreate();
    collector2.name += '2';
    Collector.create(collector2);
    collector3 = u.getCollectorToCreate();
    collector3.name += '3';
    Collector.create(collector3);
  });

  beforeEach((done) => {
    CollectorGroup.createCollectorGroup({
      name: `${tu.namePrefix}cg`,
      description: 'desc',
      createdBy: user.id,
    })
    .then((created) => {
      cg = created;
      return CollectorGroup.createCollectorGroup({
        name: `${tu.namePrefix}cg2`,
        description: 'desc2',
        createdBy: user.id,
        collectors: [collector3.name],
      });
    })
    .then((created) => {
      cg2 = created;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  after(tu.forceDeleteUser);

  it('patch with empty collector list', (done) => {
    api.patch(`/v1/collectorGroups/${cg.name}`)
      .set('Authorization', token)
      .send({ description: 'new desc', collectors: [] })
      .expect(httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('description', 'new desc');
        expect(res.body.collectors).to.be.empty;
        return done();
      });
  });

  it('patch with valid collectors', (done) => {
    api.patch(`/v1/collectorGroups/${cg.name}`)
      .set('Authorization', token)
      .send({
        description: 'hi',
        collectors: [collector1.name, collector2.name],
      })
      .expect(httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.have.property('name', cg.name);
        expect(res.body).to.have.property('description', 'hi');
        expect(res.body.collectors).to.have.lengthOf(2);
        return done();
      });
  });

  it('patch replaces collectors', (done) => {
    api.patch(`/v1/collectorGroups/${cg.name}`)
      .set('Authorization', token)
      .send({ collectors: [collector1.name] })
      .expect(httpStatus.OK)
      .end((err) => {
        if (err) {
          return done(err);
        }

        return api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({ collectors: [collector2.name] })
          .expect(httpStatus.OK)
          .end((_err, _res) => {
            if (_err) {
              return done(_err);
            }

            expect(_res.body).to.have.property('name', cg.name);
            expect(_res.body.collectors).to.have.lengthOf(1);
            expect(_res.body.collectors[0])
              .to.have.property('name', collector2.name);
            return done();
          });
      });
  });

  it('reject if collector already in a different collector group', (done) => {
    api.patch(`/v1/collectorGroups/${cg.name}`)
      .set('Authorization', token)
      .send({ collectors: [collector3.name] })
      .expect(httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors).to.have.lengthOf(1);
        expect(res.body.errors[0]).to.have.property('message',
          'Cannot double-assign collector(s) [___Coll3] to collector groups');
        expect(res.body.errors[0]).to.have.property('type', 'ValidationError');
        done();
      });
  });

  it('ok when collector was previously assigned but group was deleted', (done) => {
    api.delete(`/v1/collectorGroups/${cg2.name}`)
    .set('Authorization', token)
    .expect(httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      api.patch(`/v1/collectorGroups/${cg.name}`)
      .set('Authorization', token)
      .send({ collectors: [collector3.name] })
      .expect(httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.collectors[0].name).to.equal(collector3.name);
        done();
      });
    });
  });

  it('reject if no write perm', (done) => {
    api.patch(`/v1/collectorGroups/${cg.name}`)
      .set('Authorization', token2)
      .send({ description: 'foo', collectors: [collector1.name] })
      .expect(httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors).to.have.lengthOf(1);
        expect(res.body.errors[0]).to.have.property('type', 'ForbiddenError');
        done();
      });
  });

  describe('assign to collector >', () => {
    let clock;
    const now = Date.now();
    let collectorAliveObj1 = {
      name: 'IamAliveAndRunning1',
      version: '1.0.0',
      status: 'Running',
      lastHeartbeat: now,
    };

    let collectorAliveObj2 = {
      name: 'IamAliveAndRunning2',
      version: '1.0.0',
      status: 'Running',
      lastHeartbeat: now,
    };

    let collectorAlive1;
    let collectorAlive2;
    let generatorInst;
    const generator = gu.getGenerator();
    const generatorTemplate = gtu.getGeneratorTemplate();
    gu.createSGtoSGTMapping(generatorTemplate, generator);
    generator.isActive = true;

    beforeEach(() => {
      clock = sinon.useFakeTimers(now);
    });

    beforeEach((done) => { // create alive collectors
      tu.db.Collector.bulkCreate([collectorAliveObj1, collectorAliveObj2])
      .then((collectors) => {
        collectorAlive1 = collectors[0];
        collectorAlive2 = collectors[1];
        return GeneratorTemplate.create(generatorTemplate);
      })
      .then(() => Generator.create(generator, { validate: false }))
      .then((gen) => {
        generatorInst = gen;
        return generatorInst.setCollectorGroup(cg);
      })
      .then(() => done())
      .catch(done);
    });

    afterEach(() => clock.restore());

    it('unassigned generator, patch collector group with collectors should ' +
      'set currentCollector if alive collector is available', (done) => {
      generatorInst.reload()
      .then((updatedGenInst) => {
        expect(updatedGenInst.currentCollector).to.not.exist;
        api.patch(`/v1/collectorGroups/${cg.name}`)
        .set('Authorization', token)
        .send({
          collectors: [collector1.name, collectorAlive1.name],
        })
        .expect(httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          const collectors = res.body.collectors;
          expect(Array.isArray(collectors)).to.be.true;
          expect(collectors.length).to.equal(2);
          const collectorNames = collectors.map((collector) => collector.name);
          expect(collectorNames).to.have.members([collector1.name, collectorAlive1.name]);

          api.get(`/v1/generators/${generatorInst.name}`)
          .set('Authorization', token)
          .expect(httpStatus.OK)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(res.body.currentCollector.name).to.equal(collectorAlive1.name);
            return done();
          });
        });
      });
    });

    it('unassigned generator, patch collector group with collectors should ' +
      'not set currentCollector if no alive collector is available', (done) => {
      generatorInst.reload()
      .then((updatedGenInst) => {
        expect(updatedGenInst.currentCollector).to.not.exist;
        api.patch(`/v1/collectorGroups/${cg.name}`)
        .set('Authorization', token)
        .send({
          collectors: [collector1.name, collector2.name],
        })
        .expect(httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          const collectors = res.body.collectors;
          expect(Array.isArray(collectors)).to.be.true;
          expect(collectors.length).to.equal(2);
          const collectorNames = collectors.map((collector) => collector.name);
          expect(collectorNames).to.have.members([collector1.name, collector2.name]);

          api.get(`/v1/generators/${generatorInst.name}`)
          .set('Authorization', token)
          .expect(httpStatus.OK)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(res.body.currentCollector).to.not.exist;
            return done();
          });
        });
      });
    });

    it('already assigned generator, patch collectorGroup should not change ' +
      'currentCollector if currentCollector exists in updated collector list',
      (done) => {
        generatorInst.update({ collectorId: collectorAlive1.id })
        .then((gen) => gen.reload())
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector.name).to.be.equal(collectorAlive1.name);
          api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({
            collectors: [collector1.name, collectorAlive1.name, collectorAlive2.name],
          })
          .expect(httpStatus.OK)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const collectors = res.body.collectors;
            expect(Array.isArray(collectors)).to.be.true;
            expect(collectors.length).to.equal(3);
            const collectorNames = collectors.map((collector) => collector.name);
            expect(collectorNames).to.have.members(
              [collector1.name, collectorAlive1.name, collectorAlive2.name]
            );

            api.get(`/v1/generators/${generatorInst.name}`)
            .set('Authorization', token)
            .expect(httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              expect(res.body.currentCollector.name).to.equal(collectorAlive1.name);
              return done();
            });
          });
        }).catch(done);
      });

    it('already assigned generator, patch collectorGroup should set ' +
      'currentCollector to null if currentCollector does not exist in ' +
      'updated collector list', (done) => {
      generatorInst.update({ collectorId: collectorAlive1.id })
      .then((gen) => gen.reload())
      .then((updatedGenInst) => {
        expect(updatedGenInst.currentCollector.name).to.be.equal(collectorAlive1.name);
        api.patch(`/v1/collectorGroups/${cg.name}`)
        .set('Authorization', token)
        .send({
          collectors: [collector1.name, collector2.name],
        })
        .expect(httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          const collectors = res.body.collectors;
          expect(Array.isArray(collectors)).to.be.true;
          expect(collectors.length).to.equal(2);
          const collectorNames = collectors.map((collector) => collector.name);
          expect(collectorNames).to.have.members(
            [collector1.name, collector2.name]
          );

          api.get(`/v1/generators/${generatorInst.name}`)
          .set('Authorization', token)
          .expect(httpStatus.OK)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(res.body.currentCollector).to.not.exist;
            return done();
          });
        });
      }).catch(done);
    });

    it('already assigned generator, patch collectorGroup should set ' +
      'currentCollector to another alive collector if currentCollector ' +
      'does not exist in updated collector list', (done) => {
      generatorInst.update({ collectorId: collectorAlive1.id })
      .then((gen) => gen.reload())
      .then((updatedGenInst) => {
        expect(updatedGenInst.currentCollector.name).to.be.equal(collectorAlive1.name);
        api.patch(`/v1/collectorGroups/${cg.name}`)
        .set('Authorization', token)
        .send({
          collectors: [collector2.name, collectorAlive2.name],
        })
        .expect(httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          const collectors = res.body.collectors;
          expect(Array.isArray(collectors)).to.be.true;
          expect(collectors.length).to.equal(2);
          const collectorNames = collectors.map((collector) => collector.name);
          expect(collectorNames).to.have.members(
            [collector2.name, collectorAlive2.name]
          );

          api.get(`/v1/generators/${generatorInst.name}`)
          .set('Authorization', token)
          .expect(httpStatus.OK)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            expect(res.body.currentCollector.name).to.equal(collectorAlive2.name);
            return done();
          });
        });
      }).catch(done);
    });
  });
});
