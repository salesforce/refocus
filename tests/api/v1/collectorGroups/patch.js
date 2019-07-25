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
const Promise = require('bluebird');
const api = supertest(require('../../../../express').app);
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
  let coll1;
  let coll2;
  let coll3;
  let cg = { name: '' };
  let cg2;

  let gen1;
  let gen2;
  let g1 = gu.getBasic({ name: 'gen1' });
  let g2 = gu.getBasic({ name: 'gen2' });
  const generatorTemplate = gtu.getGeneratorTemplate();
  gu.createSGtoSGTMapping(generatorTemplate, g1);
  gu.createSGtoSGTMapping(generatorTemplate, g2);
  g1.isActive = true;
  g2.isActive = true;

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
    const collector1 = u.getCollectorToCreate();
    collector1.name += '1';
    const collector2 = u.getCollectorToCreate();
    collector2.name += '2';
    const collector3 = u.getCollectorToCreate();
    collector3.name += '3';
    return Promise.join(
      Collector.create(collector1),
      Collector.create(collector2),
      Collector.create(collector3),
    )
    .then(([c1, c2, c3]) => {
      coll1 = c1;
      coll2 = c2;
      coll3 = c3;
    })
    .then(() => GeneratorTemplate.create(generatorTemplate))
    .then(() => Promise.join(
      Generator.create(g1, {
        validate: false,
        include: Generator.options.defaultScope.include,
      }),
      Generator.create(g2, {
        validate: false,
        include: Generator.options.defaultScope.include,
      }),
    ))
    .then(([g1, g2]) => {
      gen1 = g1;
      gen2 = g2;
    });
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
        collectors: [coll3.name],
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
        collectors: [coll1.name, coll2.name],
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
      .send({ collectors: [coll1.name] })
      .expect(httpStatus.OK)
      .end((err) => {
        if (err) {
          return done(err);
        }

        return api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({ collectors: [coll2.name] })
          .expect(httpStatus.OK)
          .end((_err, _res) => {
            if (_err) {
              return done(_err);
            }

            expect(_res.body).to.have.property('name', cg.name);
            expect(_res.body.collectors).to.have.lengthOf(1);
            expect(_res.body.collectors[0])
              .to.have.property('name', coll2.name);
            return done();
          });
      });
  });

  it('reject if collector already in a different collector group', (done) => {
    api.patch(`/v1/collectorGroups/${cg.name}`)
      .set('Authorization', token)
      .send({ collectors: [coll3.name] })
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
      .send({ collectors: [coll3.name] })
      .expect(httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.collectors[0].name).to.equal(coll3.name);
        done();
      });
    });
  });

  it('patch with empty generator list', (done) => {
    api.patch(`/v1/collectorGroups/${cg.name}`)
    .set('Authorization', token)
    .send({ description: 'new desc', generators: [] })
    .expect(httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.property('description', 'new desc');
      expect(res.body.generators).to.be.empty;
      return done();
    });
  });

  it('patch with valid generators', (done) => {
    api.patch(`/v1/collectorGroups/${cg.name}`)
    .set('Authorization', token)
    .send({
      description: 'hi',
      generators: [gen1.name, gen2.name],
    })
    .expect(httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).to.have.property('name', cg.name);
      expect(res.body).to.have.property('description', 'hi');
      expect(res.body.generators).to.have.lengthOf(2);
      return done();
    });
  });

  it('patch replaces generators', (done) => {
    api.patch(`/v1/collectorGroups/${cg.name}`)
    .set('Authorization', token)
    .send({ generators: [gen1.name] })
    .expect(httpStatus.OK)
    .end((err) => {
      if (err) {
        return done(err);
      }

      return api.patch(`/v1/collectorGroups/${cg.name}`)
      .set('Authorization', token)
      .send({ generators: [gen2.name] })
      .expect(httpStatus.OK)
      .end((_err, _res) => {
        if (_err) {
          return done(_err);
        }

        expect(_res.body).to.have.property('name', cg.name);
        expect(_res.body.generators).to.have.lengthOf(1);
        expect(_res.body.generators[0])
          .to.have.property('name', gen2.name);
        return done();
      });
    });
  });

  it('reject if generator already in a different collector group', (done) => {
    api.patch(`/v1/collectorGroups/${cg2.name}`)
    .set('Authorization', token)
    .send({ generators: [gen1.name] })
    .expect(httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      api.patch(`/v1/collectorGroups/${cg.name}`)
      .set('Authorization', token)
      .send({ generators: [gen1.name] })
      .expect(httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors).to.have.lengthOf(1);
        expect(res.body.errors[0]).to.have.property('message',
          'Cannot double-assign generator(s) [gen1] to collector groups');
        expect(res.body.errors[0]).to.have.property('type', 'ValidationError');
        done();
      });
    });
  });

  it('reject if no write perm', (done) => {
    api.patch(`/v1/collectorGroups/${cg.name}`)
      .set('Authorization', token2)
      .send({ description: 'foo', collectors: [coll1.name] })
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

    beforeEach(() => {
      clock = sinon.useFakeTimers(now);
    });

    beforeEach((done) => { // create alive collectors
      tu.db.Collector.bulkCreate([collectorAliveObj1, collectorAliveObj2])
      .then((collectors) => {
        collectorAlive1 = collectors[0];
        collectorAlive2 = collectors[1];
      })
      .then(() => done())
      .catch(done);
    });

    afterEach(() => clock.restore());

    describe('update collectors >', () => {
      beforeEach(() => Promise.join(
        cg.setGenerators([gen1, gen2]),
      ));

      it('unassigned generator, patch collector group with collectors should ' +
        'set currentCollector if alive collector is available', (done) => {
        gen1.reload()
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector).to.not.exist;
          api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({
            collectors: [coll1.name, collectorAlive1.name],
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
            expect(collectorNames).to.have.members([coll1.name, collectorAlive1.name]);

            api.get(`/v1/generators/${gen1.name}`)
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
        gen1.reload()
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector).to.not.exist;
          api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({
            collectors: [coll1.name, coll2.name],
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
            expect(collectorNames).to.have.members([coll1.name, coll2.name]);

            api.get(`/v1/generators/${gen1.name}`)
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
          gen1.update({ collectorId: collectorAlive1.id })
          .then((gen) => gen.reload())
          .then((updatedGenInst) => {
            expect(updatedGenInst.currentCollector.name).to.be.equal(collectorAlive1.name);
            api.patch(`/v1/collectorGroups/${cg.name}`)
            .set('Authorization', token)
            .send({
              collectors: [coll1.name, collectorAlive1.name, collectorAlive2.name],
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
                [coll1.name, collectorAlive1.name, collectorAlive2.name]
              );

              api.get(`/v1/generators/${gen1.name}`)
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
        gen1.update({ collectorId: collectorAlive1.id })
        .then((gen) => gen.reload())
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector.name).to.be.equal(collectorAlive1.name);
          api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({
            collectors: [coll1.name, coll2.name],
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
              [coll1.name, coll2.name]
            );

            api.get(`/v1/generators/${gen1.name}`)
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
        gen1.update({ collectorId: collectorAlive1.id })
        .then((gen) => gen.reload())
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector.name).to.be.equal(collectorAlive1.name);
          api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({
            collectors: [coll2.name, collectorAlive2.name],
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
              [coll2.name, collectorAlive2.name]
            );

            api.get(`/v1/generators/${gen1.name}`)
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

      it('already assigned generator, patch collectors to empty list' +
        'should set currentCollector to null', (done) => {
        cg2.setCollectors([coll2, collectorAlive2])
        .then(() => gen1.update({ collectorId: collectorAlive1.id }))
        .then((gen) => gen.reload())
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector.name).to.be.equal(collectorAlive1.name);
          api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({
            collectors: [],
          })
          .expect(httpStatus.OK)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const collectors = res.body.collectors;
            expect(Array.isArray(collectors)).to.be.true;
            expect(collectors.length).to.equal(0);

            api.get(`/v1/generators/${gen1.name}`)
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
    });

    describe('update generators >', () => {
      beforeEach(() => Promise.join(
        cg.setCollectors([coll1, collectorAlive1, collectorAlive2]),
        cg2.setCollectors([coll2, coll3]),
      ));

      it('unassigned generator, patch collector group with generators should ' +
        'set currentCollector if alive collector is available', (done) => {
        gen1.reload()
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector).to.not.exist;
          api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({
            generators: [gen1.name],
          })
          .expect(httpStatus.OK)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const generators = res.body.generators;
            expect(Array.isArray(generators)).to.be.true;
            expect(generators.length).to.equal(1);
            const generatorNames = generators.map((generator) => generator.name);
            expect(generatorNames).to.have.members([gen1.name]);

            api.get(`/v1/generators/${gen1.name}`)
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

      it('unassigned generator, patch collector group with generators should ' +
        'not set currentCollector if no alive collector is available', (done) => {
        gen1.reload()
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector).to.not.exist;
          api.patch(`/v1/collectorGroups/${cg2.name}`)
          .set('Authorization', token)
          .send({
            generators: [gen1.name],
          })
          .expect(httpStatus.OK)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const generators = res.body.generators;
            expect(Array.isArray(generators)).to.be.true;
            expect(generators.length).to.equal(1);
            const generatorNames = generators.map((generator) => generator.name);
            expect(generatorNames).to.have.members([gen1.name]);

            api.get(`/v1/generators/${gen1.name}`)
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
          cg.setGenerators([gen1])
          .then(() => gen1.update({ collectorId: collectorAlive1.id }))
          .then((gen) => gen.reload())
          .then((updatedGenInst) => {
            expect(updatedGenInst.currentCollector.name).to.be.equal(collectorAlive1.name);
            api.patch(`/v1/collectorGroups/${cg.name}`)
            .set('Authorization', token)
            .send({
              generators: [gen1.name],
            })
            .expect(httpStatus.OK)
            .end((err, res) => {
              if (err) {
                return done(err);
              }

              const generators = res.body.generators;
              expect(Array.isArray(generators)).to.be.true;
              expect(generators.length).to.equal(1);
              const generatorNames = generators.map((generator) => generator.name);
              expect(generatorNames).to.have.members([gen1.name]);

              api.get(`/v1/generators/${gen1.name}`)
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
        gen1.update({ collectorId: collectorAlive1.id })
        .then((gen) => gen.reload())
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector.name).to.be.equal(collectorAlive1.name);
          api.patch(`/v1/collectorGroups/${cg2.name}`)
          .set('Authorization', token)
          .send({
            generators: [gen1.name],
          })
          .expect(httpStatus.OK)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const generators = res.body.generators;
            expect(Array.isArray(generators)).to.be.true;
            expect(generators.length).to.equal(1);
            const generatorNames = generators.map((generator) => generator.name);
            expect(generatorNames).to.have.members([gen1.name]);

            api.get(`/v1/generators/${gen1.name}`)
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
        cg2.setCollectors([coll2, collectorAlive2])
        .then(() => gen1.update({ collectorId: collectorAlive1.id }))
        .then((gen) => gen.reload())
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector.name).to.be.equal(collectorAlive1.name);
          api.patch(`/v1/collectorGroups/${cg2.name}`)
          .set('Authorization', token)
          .send({
            generators: [gen1.name],
          })
          .expect(httpStatus.OK)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const generators = res.body.generators;
            expect(Array.isArray(generators)).to.be.true;
            expect(generators.length).to.equal(1);
            const generatorNames = generators.map((generator) => generator.name);
            expect(generatorNames).to.have.members([gen1.name]);

            api.get(`/v1/generators/${gen1.name}`)
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

      it('already assigned generator, patch generators to empty list ' +
        'should set currentCollector to null', (done) => {
        cg.setGenerators([gen1])
        .then(() => cg.setCollectors([coll2, collectorAlive2]))
        .then(() => gen1.update({ collectorId: collectorAlive1.id }))
        .then((gen) => gen.reload())
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector.name).to.be.equal(collectorAlive1.name);
          api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({
            generators: [],
          })
          .expect(httpStatus.OK)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const generators = res.body.generators;
            expect(Array.isArray(generators)).to.be.true;
            expect(generators.length).to.equal(0);

            api.get(`/v1/generators/${gen1.name}`)
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
    });

    describe('update both >', () => {
      beforeEach(() => Promise.join(
        cg.setGenerators([gen1, gen2]),
        cg.setCollectors([coll1, collectorAlive1, collectorAlive2]),
      ));

      it('unassigned generator, patch collector group should ' +
        'set currentCollector if alive collector is available', (done) => {
        gen1.reload()
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector).to.not.exist;
          api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({
            collectors: [coll1.name, collectorAlive1.name],
            generators: [gen1.name],
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
            expect(collectorNames).to.have.members([coll1.name, collectorAlive1.name]);

            const generators = res.body.generators;
            expect(Array.isArray(generators)).to.be.true;
            expect(generators.length).to.equal(1);
            const generatorNames = generators.map((generator) => generator.name);
            expect(generatorNames).to.have.members([gen1.name]);

            api.get(`/v1/generators/${gen1.name}`)
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

      it('unassigned generator, patch collector group should ' +
        'not set currentCollector if no alive collector is available', (done) => {
        gen1.reload()
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector).to.not.exist;
          api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({
            collectors: [coll1.name, coll2.name],
            generators: [gen1.name],
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
            expect(collectorNames).to.have.members([coll1.name, coll2.name]);

            const generators = res.body.generators;
            expect(Array.isArray(generators)).to.be.true;
            expect(generators.length).to.equal(1);
            const generatorNames = generators.map((generator) => generator.name);
            expect(generatorNames).to.have.members([gen1.name]);

            api.get(`/v1/generators/${gen1.name}`)
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
          gen1.update({ collectorId: collectorAlive1.id })
          .then((gen) => gen.reload())
          .then((updatedGenInst) => {
            expect(updatedGenInst.currentCollector.name).to.be.equal(collectorAlive1.name);
            api.patch(`/v1/collectorGroups/${cg.name}`)
            .set('Authorization', token)
            .send({
              collectors: [coll1.name, collectorAlive1.name, collectorAlive2.name],
              generators: [gen1.name],
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
                [coll1.name, collectorAlive1.name, collectorAlive2.name]
              );

              const generators = res.body.generators;
              expect(Array.isArray(generators)).to.be.true;
              expect(generators.length).to.equal(1);
              const generatorNames = generators.map((generator) => generator.name);
              expect(generatorNames).to.have.members([gen1.name]);

              api.get(`/v1/generators/${gen1.name}`)
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
        gen1.update({ collectorId: collectorAlive1.id })
        .then((gen) => gen.reload())
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector.name).to.be.equal(collectorAlive1.name);
          api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({
            collectors: [coll1.name, coll2.name],
            generators: [gen1.name],
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
              [coll1.name, coll2.name]
            );

            const generators = res.body.generators;
            expect(Array.isArray(generators)).to.be.true;
            expect(generators.length).to.equal(1);
            const generatorNames = generators.map((generator) => generator.name);
            expect(generatorNames).to.have.members([gen1.name]);

            api.get(`/v1/generators/${gen1.name}`)
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
        gen1.update({ collectorId: collectorAlive1.id })
        .then((gen) => gen.reload())
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector.name).to.be.equal(collectorAlive1.name);
          api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({
            collectors: [coll2.name, collectorAlive2.name],
            generators: [gen1.name],
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
              [coll2.name, collectorAlive2.name]
            );

            const generators = res.body.generators;
            expect(Array.isArray(generators)).to.be.true;
            expect(generators.length).to.equal(1);
            const generatorNames = generators.map((generator) => generator.name);
            expect(generatorNames).to.have.members([gen1.name]);

            api.get(`/v1/generators/${gen1.name}`)
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

      it('already assigned generator, patch collectors to empty list ' +
        'should set currentCollector to null', (done) => {
        cg.setCollectors([coll2, collectorAlive2])
        .then(() => gen1.update({ collectorId: collectorAlive1.id }))
        .then((gen) => gen.reload())
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector.name).to.be.equal(collectorAlive1.name);
          api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({
            collectors: [],
            generators: [gen1.name],
          })
          .expect(httpStatus.OK)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const collectors = res.body.collectors;
            expect(Array.isArray(collectors)).to.be.true;
            expect(collectors.length).to.equal(0);

            const generators = res.body.generators;
            expect(Array.isArray(generators)).to.be.true;
            expect(generators.length).to.equal(1);
            const generatorNames = generators.map((generator) => generator.name);
            expect(generatorNames).to.have.members([gen1.name]);

            api.get(`/v1/generators/${gen1.name}`)
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

      it('already assigned generator, patch generators to empty list ' +
        'should set currentCollector to null', (done) => {
        cg.setCollectors([coll2, collectorAlive2])
        .then(() => gen1.update({ collectorId: collectorAlive1.id }))
        .then((gen) => gen.reload())
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector.name).to.be.equal(collectorAlive1.name);
          api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({
            collectors: [collectorAlive1.name],
            generators: [],
          })
          .expect(httpStatus.OK)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const collectors = res.body.collectors;
            expect(Array.isArray(collectors)).to.be.true;
            expect(collectors.length).to.equal(1);
            const collectorNames = collectors.map((collector) => collector.name);
            expect(collectorNames).to.have.members(
              [collectorAlive1.name]
            );

            const generators = res.body.generators;
            expect(Array.isArray(generators)).to.be.true;
            expect(generators.length).to.equal(0);

            api.get(`/v1/generators/${gen1.name}`)
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

      it('already assigned generator, patch collectors and generators to empty list' +
        'should set currentCollector to null', (done) => {
        cg.setCollectors([coll2, collectorAlive2])
        .then(() => gen1.update({ collectorId: collectorAlive1.id }))
        .then((gen) => gen.reload())
        .then((updatedGenInst) => {
          expect(updatedGenInst.currentCollector.name).to.be.equal(collectorAlive1.name);
          api.patch(`/v1/collectorGroups/${cg.name}`)
          .set('Authorization', token)
          .send({
            collectors: [],
            generators: [],
          })
          .expect(httpStatus.OK)
          .end((err, res) => {
            if (err) {
              return done(err);
            }

            const collectors = res.body.collectors;
            expect(Array.isArray(collectors)).to.be.true;
            expect(collectors.length).to.equal(0);

            const generators = res.body.generators;
            expect(Array.isArray(generators)).to.be.true;
            expect(generators.length).to.equal(0);

            api.get(`/v1/generators/${gen1.name}`)
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
    });
  });
});
