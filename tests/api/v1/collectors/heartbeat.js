/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/heartbeat.js
 */
'use strict'; // eslint-disable-line strict
const featureToggles = require('feature-toggles');
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const status = require('../../../../api/v1/constants').httpStatus;
const u = require('./utils');
const gu = require('../generators/utils');
const tu = require('../../../testUtils');
const gtUtil = require('../generatorTemplates/utils');
const expect = require('chai').expect;
const cryptUtils = require('../../../../utils/cryptUtils');
const GlobalConfig = tu.db.GlobalConfig;
const dbConstants = require('../../../../db/constants');
const config = require('../../../../config');
const Promise = require('bluebird');
const GeneratorTemplate = tu.db.GeneratorTemplate;
const Generator = tu.db.Generator;
const Collector = tu.db.Collector;
supertest.Test.prototype.end = Promise.promisify(supertest.Test.prototype.end);
supertest.Test.prototype.then = function (resolve, reject) {
  return this.end().then(resolve).catch(reject);
};

const password = 'superlongandsupersecretpassword';
const secretInformation = 'asecretthatyoushouldnotknow';
const otherNonSecretInformation = 'nonsecretInformation';
const secretKey = 'mySecretKey';
const algorithm = 'aes-256-cbc';

const contextDefinition = {
  password: {
    description: 'password description...',
    encrypted: true,
  },
  secretInformation: {
    description: 'secretInformation description...',
    encrypted: true,
  },
  otherNonSecretInformation: {
    description: 'otherNonSecretInformation description...',
    encrypted: false,
  },
};

const context = {
  password,
  secretInformation,
  otherNonSecretInformation,
};

const coll1 = u.getCollectorToCreate();
const coll2 = u.getCollectorToCreate();
const coll3 = u.getCollectorToCreate();
coll1.name += '1';
coll2.name += '2';
coll3.name += '3';
const collTokens = {};

const sgt = gtUtil.getGeneratorTemplate();
sgt.contextDefinition = contextDefinition;
const generator1 = gu.getGenerator();
const generator2 = gu.getGenerator();
const generator3 = gu.getGenerator();
generator1.context = context;
generator2.context = context;
generator3.context = context;
gu.createSGtoSGTMapping(sgt, generator1);
gu.createSGtoSGTMapping(sgt, generator2);
gu.createSGtoSGTMapping(sgt, generator3);
generator1.name += '1';
generator2.name += '2';
generator3.name += '3';
generator1.possibleCollectors = [coll1.name, coll2.name, coll3.name];
generator2.possibleCollectors = [coll1.name, coll2.name, coll3.name];
generator3.possibleCollectors = [coll1.name, coll2.name, coll3.name];

let userToken;
let userId;

describe('tests/api/v1/collectors/heartbeat.js >', () => {
  before((done) => {
    tu.createUserAndToken()
    .then((obj) => {
      userId = obj.user.id;
      userToken = obj.token;
      done();
    })
    .catch(done);
  });

  before((done) => {
    GeneratorTemplate.create(sgt)
    .then(() => gu.createGeneratorAspects())
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  beforeEach((done) => {
    GlobalConfig.create({
      key: dbConstants.SGEncryptionKey,
      value: secretKey,
    })
    .then(() => GlobalConfig.create({
      key: dbConstants.SGEncryptionAlgorithm,
      value: algorithm,
    }))
    .then(() => done())
    .catch(done);
  });

  afterEach((done) => {
    GlobalConfig.destroy({ truncate: true, force: true })
    .then(() => done())
    .catch(done);
  });

  describe('heartbeat >', () => {
    before(() => Promise.resolve()
      .then(() => u.startCollector(coll1, collTokens, userToken))
      .then(() => u.startCollector(coll2, collTokens, userToken))
      .then(() => u.startCollector(coll3, collTokens, userToken))
    );

    describe('validation >', () => {
      beforeEach(() => Promise.resolve()
        .then(() => u.stopCollector(coll1, userToken))
        .then(() => u.startCollector(coll1, collTokens, userToken))
      );

      it('no token (forbidden)', () =>
        u.sendHeartbeat({
          collector: coll1,
        })
        .expect(status.FORBIDDEN)
      );

      it('invalid token (forbidden)', () =>
        u.sendHeartbeat({
          collector: coll1,
          token: 'aaa',
        })
        .expect(status.FORBIDDEN)
      );

      it('invalid path, no token (forbidden)', () =>
        u.sendHeartbeat({
          collector: 'aaa',
        })
        .expect(status.FORBIDDEN)
      );

      it('invalid path, valid token (not found)', () =>
        u.sendHeartbeat({
          collector: 'aaa',
          token: collTokens[coll1.name],
        })
        .expect(status.NOT_FOUND)
      );

      it('valid user token but needs collector token (forbidden)', () =>
        u.sendHeartbeat({
          collector: coll1,
          token: userToken,
        })
        .expect(status.FORBIDDEN)
      );

      it('valid collector token, mismatch (forbidden) - by name', () =>
        u.sendHeartbeat({
          collector: coll1,
          token: collTokens[coll2.name],
        })
        .expect(status.FORBIDDEN)
      );

      it('valid collector token, mismatch (forbidden) - by id', () =>
        u.sendHeartbeat({
          collName: coll1.id,
          token: collTokens[coll2.name],
        })
        .expect(status.FORBIDDEN)
      );

      it('valid token, collector running (ok)', () =>
        u.sendHeartbeat({
          collector: coll1,
          tokens: collTokens,
        })
        .expect(status.OK)
      );

      it('valid token, collector paused (ok)', () =>
        u.pauseCollector(coll1, collTokens, userToken)
        .then(() =>
          u.sendHeartbeat({
            collector: coll1,
            tokens: collTokens,
          })
          .expect(status.OK)
        )
      );

      it('valid token, collector stopped (ok)', () =>
        u.stopCollector(coll1, userToken)
        .then(() =>
          u.sendHeartbeat({
            collector: coll1,
            tokens: collTokens,
          })
          .expect(status.OK)
        )
      );

      it('valid token, collector missed (ok)', () =>
        u.missHeartbeat(coll1)
        .then(() =>
          u.sendHeartbeat({
            collector: coll1,
            tokens: collTokens,
          })
          .expect(status.OK)
        )
      );
    });

    describe('status changes >', () => {
      const _coll = u.getCollectorToCreate();
      _coll.name += 'collectorForStateChange';

      afterEach(() =>
        Collector.destroy({ where: { name: _coll.name }, force: true })
      );

      it('returns the correct collector status after status change', () =>
        u.startCollector(_coll, collTokens, userToken)
        .then(() =>
          u.sendHeartbeat({ collector: _coll, tokens: collTokens })
          .expect(status.OK)
          .expect((res) => {
            expect(res.body.collectorConfig.status).to.equal('Running');
          })
        )

        .then(() => u.pauseCollector(_coll, userToken))
        .then(() =>
          u.sendHeartbeat({ collector: _coll, tokens: collTokens })
          .expect(status.OK)
          .expect((res) => {
            expect(res.body.collectorConfig.status).to.equal('Paused');
          })
        )

        .then(() => u.resumeCollector(_coll, userToken))
        .then(() =>
          u.sendHeartbeat({ collector: _coll, tokens: collTokens })
          .expect(status.OK)
          .expect((res) => {
            expect(res.body.collectorConfig.status).to.equal('Running');
          })
        )

        .then(() => u.stopCollector(_coll, userToken))
        .then(() =>
          u.sendHeartbeat({ collector: _coll, tokens: collTokens })
          .expect(status.OK)
          .expect((res) => {
            expect(res.body.collectorConfig.status).to.equal('Stopped');
            expect(res.body.generatorsAdded).to.be.empty;
            expect(res.body.generatorsDeleted).to.be.empty;
            expect(res.body.generatorsUpdated).to.be.empty;
          })
        )

        .then(() => u.resumeCollector(_coll, userToken))
        .then(() =>
          u.sendHeartbeat({ collector: _coll, tokens: collTokens })
          .expect(status.OK)
          .expect((res) => {
            expect(res.body.collectorConfig.status).to.equal('Running');
          })
        )

        .then(() => u.missHeartbeat(_coll))
        .then(() =>
          u.sendHeartbeat({ collector: _coll, tokens: collTokens })
          .expect(status.OK)
          .expect((res) => {
            expect(res.body.collectorConfig.status).to.equal('Running');
          })
        )
      );
    });

    describe('generator changes >', () => {
      // reset the tracked changes
      beforeEach((done) => {
        Promise.resolve()
        .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
        .then(() => u.sendHeartbeat({ collector: coll2, tokens: collTokens }))
        .then(() => u.sendHeartbeat({ collector: coll3, tokens: collTokens }))
        .then(() => done())
        .catch(done);
      });

      // reset generators
      afterEach((done) => {
        Promise.resolve()
        .then(() => Generator.destroy({ where: { name: generator1.name }, force: true }))
        .then(() => Generator.destroy({ where: { name: generator2.name }, force: true }))
        .then(() => Generator.destroy({ where: { name: generator3.name }, force: true }))
        .then(() => done())
        .catch(done);
      });

      //TODO: need to add DB validation that Generator.currentCollector exists
      describe.skip('make sure updating a nonexistent collector doesnt modify ' +
      'the collectorMap >', () => {
        const coll4 = u.getCollectorToCreate();
        coll4.name += '4';
        afterEach((done) => {
          Collector.destroy({ where: { name: coll4.name }, force: true });
          Generator.destroy({ where: { name: generator1.name }, force: true });
          done();
        });

        it('create with collector that doesnt exist', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll4))
          .then(() => u.startCollector(coll4, collTokens, userToken))
          .then(() => u.sendHeartbeat({ collector: coll4, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 0 },
            res))
          .then(done).catch(done);
        });

        it('update with collector that doesnt exist', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, null))
          .then(() => u.updateGenerator(generator1, userToken, coll4))
          .then(() => u.startCollector(coll4, collTokens, userToken))
          .then(() => u.sendHeartbeat({ collector: coll4, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 0 },
             res))
          .then(done).catch(done);
        });

      });

      describe('basic changes >', () => {
        it('create', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => {
            u.expectLengths({ added: 1, deleted: 0, updated: 0 }, res);
            expect(res.body.generatorsAdded[0].aspects[0])
            .to.contain.property('name', 'temperature');
          })
          .then(done).catch(done);
        });

        it('update', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then(() => u.updateGenerator(generator1, userToken))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 1 },
            res))
          .then(done).catch(done);
        });

        it('update move', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then(() => u.updateGenerator(generator1, userToken, coll2))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 1, updated: 0 }, res))
          .then(() => u.sendHeartbeat({ collector: coll2, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('no changes', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('create with no collectors', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(() => u.updateGenerator(generator1, userToken))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(() => u.updateGenerator(generator1, userToken, coll1))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('changes are not carried over after stop and restart', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then(() => u.stopCollector(coll1, userToken))
          .then(() => u.startCollector(coll1, collTokens, userToken))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('changes are not carried over after pause and resume', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then(() => u.pauseCollector(coll1, userToken))
          .then(() => u.resumeCollector(coll1, userToken))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('changes are carried over after missed heartbeat', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then(() => u.missHeartbeat(coll1))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 1, updated: 0 }, res))
          .then(done).catch(done);
        });

      });

      describe('basic changes to multiple generators >', () => {
        it('create', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.createGenerator(generator2, userId, coll1))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 2, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('update', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.createGenerator(generator2, userId, coll1))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then(() => u.updateGenerator(generator1, userToken))
          .then(() => u.updateGenerator(generator2, userToken))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 2 }, res))
          .then(done).catch(done);
        });

        it('update move', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.createGenerator(generator2, userId, coll1))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 2, deleted: 0, updated: 0 }, res))
          .then(() => u.updateGenerator(generator1, userToken, coll2))
          .then(() => u.updateGenerator(generator2, userToken, coll2))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 2, updated: 0 }, res))
          .then(() => u.sendHeartbeat({ collector: coll2, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 2, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });
      });

      describe('multiple changes to the same generator >', () => {
        it('create + update', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.updateGenerator(generator1, userToken))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('create + update move', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.updateGenerator(generator1, userToken, coll2))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(() => u.sendHeartbeat({ collector: coll2, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('update + update', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then(() => u.updateGenerator(generator1, userToken))
          .then(() => u.updateGenerator(generator1, userToken))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(done).catch(done);
        });

        it('update + update move', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then(() => u.updateGenerator(generator1, userToken))
          .then(() => u.updateGenerator(generator1, userToken, coll2))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 1, updated: 0 }, res))
          .then(() => u.sendHeartbeat({ collector: coll2, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('update move + update move', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then(() => u.updateGenerator(generator1, userToken, coll2))
          .then(() => u.updateGenerator(generator1, userToken, coll3))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 1, updated: 0 }, res))
          .then(() => u.sendHeartbeat({ collector: coll2, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(() => u.sendHeartbeat({ collector: coll3, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

      });

      describe('changes to multiple generators >', () => {
        it('update', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.createGenerator(generator2, userId, coll2))
          .then(() => u.createGenerator(generator3, userId, coll3))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(() => u.sendHeartbeat({ collector: coll2, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(() => u.sendHeartbeat({ collector: coll3, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(() => u.updateGenerator(generator1, userToken))
          .then(() => u.updateGenerator(generator2, userToken))
          .then(() => u.updateGenerator(generator3, userToken))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => u.sendHeartbeat({ collector: coll2, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => u.sendHeartbeat({ collector: coll3, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(done).catch(done);
        });

        it('update and move', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.createGenerator(generator2, userId, coll1))
          .then(() => u.createGenerator(generator3, userId, coll3))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then(() => u.sendHeartbeat({ collector: coll2, tokens: collTokens }))
          .then(() => u.sendHeartbeat({ collector: coll3, tokens: collTokens }))
          .then(() => u.updateGenerator(generator1, userToken, coll1))
          .then(() => u.updateGenerator(generator2, userToken, coll2))
          .then(() => u.updateGenerator(generator3, userToken, coll1))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 1, deleted: 1, updated: 1 }, res))
          .then(() => u.sendHeartbeat({ collector: coll2, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(() => u.sendHeartbeat({ collector: coll3, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 1, updated: 0 }, res))
          .then(done).catch(done);
        });
      });

      describe('multiple changes to multiple generators >', () => {
        it('create then move all twice', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.createGenerator(generator2, userId, coll2))
          .then(() => u.createGenerator(generator3, userId, coll3))
          .then(() => u.updateGenerator(generator1, userToken, coll1))
          .then(() => u.updateGenerator(generator2, userToken, coll1))
          .then(() => u.updateGenerator(generator3, userToken, coll1))
          .then(() => u.updateGenerator(generator1, userToken, coll2))
          .then(() => u.updateGenerator(generator2, userToken, coll2))
          .then(() => u.updateGenerator(generator3, userToken, coll2))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(() => u.sendHeartbeat({ collector: coll2, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 3, deleted: 0, updated: 0 }, res))
          .then(() => u.sendHeartbeat({ collector: coll3, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('move all twice', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.createGenerator(generator2, userId, coll2))
          .then(() => u.createGenerator(generator3, userId, coll3))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then(() => u.sendHeartbeat({ collector: coll2, tokens: collTokens }))
          .then(() => u.sendHeartbeat({ collector: coll3, tokens: collTokens }))
          .then(() => u.updateGenerator(generator1, userToken, coll1))
          .then(() => u.updateGenerator(generator2, userToken, coll1))
          .then(() => u.updateGenerator(generator3, userToken, coll1))
          .then(() => u.updateGenerator(generator1, userToken, coll2))
          .then(() => u.updateGenerator(generator2, userToken, coll2))
          .then(() => u.updateGenerator(generator3, userToken, coll2))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 1, updated: 0 }, res))
          .then(() => u.sendHeartbeat({ collector: coll2, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 2, deleted: 0, updated: 1 }, res))
          .then(() => u.sendHeartbeat({ collector: coll3, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 1, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('move all - cycle collectors', (done) => {
          Promise.resolve()
          .then(() => u.createGenerator(generator1, userId, coll1))
          .then(() => u.createGenerator(generator2, userId, coll2))
          .then(() => u.createGenerator(generator3, userId, coll3))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then(() => u.sendHeartbeat({ collector: coll2, tokens: collTokens }))
          .then(() => u.sendHeartbeat({ collector: coll3, tokens: collTokens }))
          .then(() => u.updateGenerator(generator1, userToken, coll2))
          .then(() => u.updateGenerator(generator2, userToken, coll3))
          .then(() => u.updateGenerator(generator3, userToken, coll1))
          .then(() => u.updateGenerator(generator1, userToken, coll3))
          .then(() => u.updateGenerator(generator2, userToken, coll1))
          .then(() => u.updateGenerator(generator3, userToken, coll2))
          .then(() => u.updateGenerator(generator1, userToken, coll1))
          .then(() => u.updateGenerator(generator2, userToken, coll2))
          .then(() => u.updateGenerator(generator3, userToken, coll3))
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => u.sendHeartbeat({ collector: coll2, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => u.sendHeartbeat({ collector: coll3, tokens: collTokens }))
          .then((res) => u.expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(done).catch(done);
        });
      });

    });

    describe('config changes >', () => {
      it('config ok', (done) => {
        u.sendHeartbeat({ collector: coll1, tokens: collTokens })
        .then((res) => {
          expect(res.body).to.have.property('collectorConfig');
          expect(res.body.collectorConfig)
          .to.have.property('heartbeatIntervalMillis', 15000);
          expect(res.body.collectorConfig)
          .to.have.property('heartbeatLatencyToleranceMillis', 5000);
          expect(res.body.collectorConfig)
          .to.have.property('sampleUpsertQueueTimeMillis', 15000);
          expect(res.body.collectorConfig)
          .to.have.property('maxSamplesPerBulkUpsert', 1000);
          expect(res.body.collectorConfig).to.have.property('status');
        })
        .then(done).catch(done);
      });

      it('change config', (done) => {
        config.collector.heartbeatIntervalMillis = 10000;
        u.sendHeartbeat({ collector: coll1, tokens: collTokens })
        .then((res) => {
          expect(res.body.collectorConfig)
          .to.have.property('heartbeatIntervalMillis', 10000);
          expect(res.body.collectorConfig)
          .to.have.property('heartbeatLatencyToleranceMillis', 5000);
          expect(res.body.collectorConfig)
          .to.have.property('sampleUpsertQueueTimeMillis', 15000);
          expect(res.body.collectorConfig)
          .to.have.property('maxSamplesPerBulkUpsert', 1000);
          expect(res.body.collectorConfig).to.have.property('status');
        })
        .then(done).catch(done);
      });
    });

    describe('set lastHeartbeat time >', () => {
      it('', (done) => {
        const timestamp = Date.now();
        u.sendHeartbeat({
          collector: coll1,
          tokens: collTokens,
          body: { timestamp },
        })
        .then(() => u.getCollector(userToken, coll1))
        .then((res) => {
          expect(Date(res.body.lastHeartbeat)).to.equal(Date(timestamp));
        })
        .then(done).catch(done);
      });
    });

    describe('update metadata >', () => {
      const originalOsInfo = {
        arch: 'x64',
        hostname: 'host1.abc.com',
        platform: 'darwin',
        release: '16.7.0',
        type: 'Darwin',
        username: 'user1',
      };
      const originalProcessInfo = {
        execPath: '/usr/local/bin/node',
        memoryUsage: { rss: 1000, heapTotal: 1000, heapUsed: 1000 },
        uptime: 0.500,
        version: 'v1.0.0',
        versions: {
          http_parser: '1.0.0',
          node: '1.0.0',
          v8: '1.0.0',
          uv: '1.0.0',
          zlib: '1.0.0',
          ares: '1.0.0',
          icu: '1.0.0',
          modules: '1.0.0',
          openssl: '1.0.0',
        },
      };
      const originalVersion = '1.0.0';

      const changedOsInfo = {
        release: '16.7.1',
        username: 'user2',
      };
      const changedProcessInfo = {
        memoryUsage: { rss: 2000, heapTotal: 1000, heapUsed: 1000 },
        uptime: 1.500,
      };
      const changedVersion = '1.0.1';

      const updatedOsInfo = JSON.parse(JSON.stringify(originalOsInfo));
      const updatedProcessInfo = JSON.parse(JSON.stringify(originalProcessInfo));
      Object.assign(updatedOsInfo, changedOsInfo);
      Object.assign(updatedProcessInfo, changedProcessInfo);
      const updatedVersion = changedVersion;

      beforeEach((done) => {
        u.sendHeartbeat({
          collector: coll1,
          tokens: collTokens,
          body: {
            timestamp: Date.now(),
            collectorConfig: {
              osInfo: originalOsInfo,
              processInfo: originalProcessInfo,
              version: originalVersion,
            },
          },
        })
        .then(() => done()).catch(done);
      });

      it('one at a time', (done) => {
        u.getCollector(userToken, coll1)
        .then((res) => {
          expect(res.body.osInfo).to.deep.equal(originalOsInfo);
          expect(res.body.processInfo).to.deep.equal(originalProcessInfo);
          expect(res.body.version).to.equal(originalVersion);
        })
        .then(() => u.sendHeartbeat({
          collector: coll1,
          tokens: collTokens,
          body: {
            timestamp: Date.now(),
            collectorConfig: {
              osInfo: changedOsInfo,
            },
          },
        }))
        .then(() => u.getCollector(userToken, coll1))
        .then((res) => {
          expect(res.body.osInfo).to.deep.equal(updatedOsInfo);
          expect(res.body.processInfo).to.deep.equal(originalProcessInfo);
          expect(res.body.version).to.equal(originalVersion);
        })
        .then(() => u.sendHeartbeat({
          collector: coll1,
          tokens: collTokens,
          body: {
            timestamp: Date.now(),
            collectorConfig: {
              processInfo: changedProcessInfo,
            },
          },
        }))
        .then(() => u.getCollector(userToken, coll1))
        .then((res) => {
          expect(res.body.osInfo).to.deep.equal(updatedOsInfo);
          expect(res.body.processInfo).to.deep.equal(updatedProcessInfo);
          expect(res.body.version).to.equal(originalVersion);
        })
        .then(() => u.sendHeartbeat({
          collector: coll1,
          tokens: collTokens,
          body: {
            timestamp: Date.now(),
            collectorConfig: {
              version: changedVersion,
            },
          },
        }))
        .then(() => u.getCollector(userToken, coll1))
        .then((res) => {
          expect(res.body.osInfo).to.deep.equal(updatedOsInfo);
          expect(res.body.processInfo).to.deep.equal(updatedProcessInfo);
          expect(res.body.version).to.equal(updatedVersion);
        })
        .then(() => done())
        .catch(done);
      });

      it('all at once', (done) => {
        u.getCollector(userToken, coll1)
        .then((res) => {
          expect(res.body.osInfo).to.deep.equal(originalOsInfo);
          expect(res.body.processInfo).to.deep.equal(originalProcessInfo);
          expect(res.body.version).to.equal(originalVersion);
        })
        .then(() => u.sendHeartbeat({
          collector: coll1,
          tokens: collTokens,
          body: {
            timestamp: Date.now(),
            collectorConfig: {
              osInfo: changedOsInfo,
              processInfo: changedProcessInfo,
              version: changedVersion,
            },
          },
        }))
        .then(() => u.getCollector(userToken, coll1))
        .then((res) => {
          expect(res.body.osInfo).to.deep.equal(updatedOsInfo);
          expect(res.body.processInfo).to.deep.equal(updatedProcessInfo);
          expect(res.body.version).to.equal(updatedVersion);
        })
        .then(() => done())
        .catch(done);
      });
    });

    describe('encryption >', () => {
      const encryptedSG = JSON.parse(JSON.stringify(generator1));
      beforeEach((done) => {
        cryptUtils.encryptSGContextValues(GlobalConfig, encryptedSG, sgt)
        .then(() => done())
        .catch(done);
      });

      it('encryption - api', (done) => {
        const authToken = collTokens[coll1.name];
        const timestamp = Date.now();
        const secretKeyColl = authToken + timestamp;

        u.createGenerator(generator1, userId, coll1)
        .then(() => u.sendHeartbeat({
          collector: coll1,
          tokens: collTokens,
          body: { timestamp },
        }))
        .then((res) => {
          const reencryptedSG = res.body.generatorsAdded[0];
          expect(reencryptedSG).to.not.equal(undefined);
          expect(reencryptedSG.context.secretInformation)
          .to.not.equal(encryptedSG.context.secretInformation);
          expect(reencryptedSG.context.otherNonSecretInformation)
          .equal(otherNonSecretInformation);

          // decrypt the reencryptedSG, this would basically happen on collector
          const sg = reencryptedSG;
          const sgt = reencryptedSG.generatorTemplate;
          Object.keys(sgt.contextDefinition).forEach((key) => {
            if (sgt.contextDefinition[key].encrypted && sg.context[key]) {
              sg.context[key] = cryptUtils.decrypt(sg.context[key],
                secretKeyColl, config.encryptionAlgoForCollector);
            }
          });

          const decryptedSG = sg;

          // verify the decrypted context values
          expect(decryptedSG).to.not.equal(undefined);
          expect(decryptedSG.context.secretInformation)
          .equal(secretInformation);
          expect(decryptedSG.context.otherNonSecretInformation)
          .equal(otherNonSecretInformation);
          expect(Object.keys(decryptedSG)).to.deep
          .equal(Object.keys(reencryptedSG));
        })
        .then(done)
        .catch(done);
      });
    });

    describe('added generator >', () => {
      const initialFeatureState = featureToggles
        .isFeatureEnabled('returnUser');
      before(() => tu.toggleOverride('returnUser', true));
      after(() => tu.toggleOverride('returnUser', initialFeatureState));

      // setup and create a new generator with the createdBy field
      it('contains the user', (done) => {
        const gtPath = '/v1/generatorTemplates';
        const sgtCopy = JSON.parse(JSON.stringify(sgt));
        sgtCopy.name = 'iAmNew';
        sgtCopy.createdBy = userId;
        sgtCopy.contextDefinition = contextDefinition;
        gu.createSGtoSGTMapping(sgtCopy, generator2);

        api.post(gtPath)
        .set('Authorization', userToken)
        .send(sgtCopy)
        .expect(status.CREATED)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          expect(res.body.createdBy).to.equal(userId);
          return u.createGenerator(generator2, userId, coll1)
          .then(() => u.sendHeartbeat({ collector: coll1, tokens: collTokens }))
          .then((res) => {
            expect(res.body.generatorsAdded[0])
              .to.have.property('intervalSecs', 60);
            const reencryptedSG = res.body.generatorsAdded[0];
            expect(reencryptedSG.token).to.be.a('string');
            done();
          })
          .catch(done);
        });
      });
    });
  });
});
