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
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const reEncryptSGContextValues = require(
  '../../../../api/v1/controllers/collectors').reEncryptSGContextValues;
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
supertest.Test.prototype.endAsync = Promise.promisify(supertest.Test.prototype.end);

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

const collector1 = JSON.parse(JSON.stringify(u.toCreate));
const collector2 = JSON.parse(JSON.stringify(u.toCreate));
const collector3 = JSON.parse(JSON.stringify(u.toCreate));
collector1.name += '1';
collector2.name += '2';
collector3.name += '3';
const collectorTokens = {};

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

let userToken;

describe('tests/api/v1/collectors/heartbeat.js >', () => {
  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      userToken = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    GeneratorTemplate.create(sgt)
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
    before((done) => {
      Promise.resolve()
      .then(() => startCollector(collector1))
      .then(() => startCollector(collector2))
      .then(() => startCollector(collector3))
      .then(() => done()).catch(done);
    });

    describe('validation', () => {
      it('no token', (done) => {
        api.post(`/v1/collectors/${collector1.name}/heartbeat`)
        .send({ timestamp: Date.now() })
        .expect(constants.httpStatus.FORBIDDEN)
        .end(done);
      });

      it('invalid token', (done) => {
        api.post(`/v1/collectors/${collector1.name}/heartbeat`)
        .set('Authorization', 'aaa')
        .send({ timestamp: Date.now() })
        .expect(constants.httpStatus.FORBIDDEN)
        .end(done);
      });

      it('invalid path, no token', (done) => {
        api.post('/v1/collectors/AAA/heartbeat')
        .send({ timestamp: Date.now() })
        .expect(constants.httpStatus.FORBIDDEN)
        .end(done);
      });

      it('invalid path, valid token', (done) => {
        api.post('/v1/collectors/AAA/heartbeat')
        .set('Authorization', collectorTokens[collector1.name])
        .send({ timestamp: Date.now() })
        .expect(constants.httpStatus.NOT_FOUND)
        .end(done);
      });

      it('valid user token', (done) => {
        api.post(`/v1/collectors/${collector1.name}/heartbeat`)
        .set('Authorization', userToken)
        .send({ timestamp: Date.now() })
        .expect(constants.httpStatus.FORBIDDEN)
        .end(done);
      });

      it('valid collector token, doesnt match collector - by name', (done) => {
        api.post(`/v1/collectors/${collector1.name}/heartbeat`)
        .set('Authorization', collectorTokens[collector2.name])
        .send({ timestamp: Date.now() })
        .expect(constants.httpStatus.FORBIDDEN)
        .end(done);
      });

      it('valid collector token, doesnt match collector - by id', (done) => {
        api.post(`/v1/collectors/${collector1.id}/heartbeat`)
        .set('Authorization', collectorTokens[collector2.name])
        .send({ timestamp: Date.now() })
        .expect(constants.httpStatus.FORBIDDEN)
        .end(done);
      });

      it('valid token, matches collector, collector stopped - by name', (done) => {
        stopCollector(collector1)
        .then(() => {
          api.post(`/v1/collectors/${collector1.name}/heartbeat`)
          .set('Authorization', collectorTokens[collector1.name])
          .send({ timestamp: Date.now() })
          .expect(constants.httpStatus.FORBIDDEN)
          .end(done);
        });
      });

      it('valid token, matches collector, collector stopped - by id', (done) => {
        stopCollector(collector1)
        .then(() => {
          api.post(`/v1/collectors/${collector1.id}/heartbeat`)
          .set('Authorization', collectorTokens[collector1.name])
          .send({ timestamp: Date.now() })
          .expect(constants.httpStatus.FORBIDDEN)
          .end(done);
        });
      });

      it('valid token, matches collector, collector running - by name', (done) => {
        startCollector(collector1)
        .then(() => {
          api.post(`/v1/collectors/${collector1.name}/heartbeat`)
          .set('Authorization', collectorTokens[collector1.name])
          .send({ timestamp: Date.now() })
          .expect(constants.httpStatus.OK)
          .end(done);
        });
      });

      it('valid token, matches collector, collector running - by id', (done) => {
        api.post(`/v1/collectors/${collector1.id}/heartbeat`)
        .set('Authorization', collectorTokens[collector1.name])
        .send({ timestamp: Date.now() })
        .expect(constants.httpStatus.OK)
        .end(done);
      });

    });

    describe('generator changes', () => {

      // reset the tracked changes
      beforeEach((done) => {
        Promise.resolve()
        .then(() => sendHeartbeat(collector1))
        .then(() => sendHeartbeat(collector2))
        .then(() => sendHeartbeat(collector3))
        .then(() => done()).catch(done);
      });

      // reset generators
      afterEach((done) => {
        Promise.resolve()
        .then(() => Generator.destroy({ where: { name: generator1.name }, force: true }))
        .then(() => Generator.destroy({ where: { name: generator2.name }, force: true }))
        .then(() => Generator.destroy({ where: { name: generator3.name }, force: true }))
        .then(() => done()).catch(done);
      });

      describe('make sure updating a nonexistent collector doesnt modify ' +
      'the collectorMap', () => {
        const collector4 = JSON.parse(JSON.stringify(u.toCreate));
        collector4.name += '4';
        afterEach((done) => {
            Collector.destroy({ where: { name: collector4.name }, force: true });
            Generator.destroy({ where: { name: generator1.name }, force: true });
            done();
          });

        it('post with collector that doesnt exist', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector4], 404))
          .then(() => startCollector(collector4))
          .then(() => sendHeartbeat(collector4))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('patch with collector that doesnt exist', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, []))
          .then(() => patchGenerator(generator1, [collector4], 404))
          .then(() => startCollector(collector4))
          .then(() => sendHeartbeat(collector4))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('put with collector that doesnt exist', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, []))
          .then(() => putGenerator(generator1, [collector4], 404))
          .then(() => startCollector(collector4))
          .then(() => sendHeartbeat(collector4))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

      });

      describe('basic updates', () => {
        it('post', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('patch', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then(() => patchGenerator(generator1))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(done).catch(done);
        });

        it('patch add', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then(() => patchGenerator(generator1, [collector2]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('put', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then(() => putGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(done).catch(done);
        });

        it('put move', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then(() => putGenerator(generator1, [collector2]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 1, updated: 0 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('no updates', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('post with no collectors', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(() => patchGenerator(generator1))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(() => patchGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('patch with duplicate names', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then(() => patchGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => patchGenerator(generator1, [collector1, collector2]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

      });

      describe('basic updates to multiple generators', () => {
        it('post', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => postGenerator(generator2, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 2, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('patch', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => postGenerator(generator2, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then(() => patchGenerator(generator1))
          .then(() => patchGenerator(generator2))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 2 }, res))
          .then(done).catch(done);
        });

        it('patch add', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => postGenerator(generator2, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 2, deleted: 0, updated: 0 }, res))
          .then(() => patchGenerator(generator1, [collector2]))
          .then(() => patchGenerator(generator2, [collector2]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 2 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 2, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('put', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => postGenerator(generator2, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 2, deleted: 0, updated: 0 }, res))
          .then(() => putGenerator(generator1, [collector1]))
          .then(() => putGenerator(generator2, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 2 }, res))
          .then(done).catch(done);
        });

        it('put move', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => postGenerator(generator2, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 2, deleted: 0, updated: 0 }, res))
          .then(() => putGenerator(generator1, [collector2]))
          .then(() => putGenerator(generator2, [collector2]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 2, updated: 0 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 2, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });
      });

      describe('basic updates with multiple collectors', () => {
        it('post', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1, collector2]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('patch', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1, collector2]))
          .then(() => sendHeartbeat(collector1))
          .then(() => sendHeartbeat(collector2))
          .then(() => patchGenerator(generator1))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(done).catch(done);
        });

        it('put', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1, collector2]))
          .then(() => sendHeartbeat(collector1))
          .then(() => sendHeartbeat(collector2))
          .then(() => putGenerator(generator1, [collector1, collector2]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(done).catch(done);
        });

      });

      describe('multiple updates to the same generator', () => {
        it('post + patch', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => patchGenerator(generator1))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('post + patch add', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => patchGenerator(generator1, [collector2]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('patch + patch', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then(() => patchGenerator(generator1))
          .then(() => patchGenerator(generator1))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(done).catch(done);
        });

        it('patch + patch add', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then(() => patchGenerator(generator1))
          .then(() => patchGenerator(generator1, [collector2]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('patch add + patch add', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then(() => patchGenerator(generator1, [collector2]))
          .then(() => patchGenerator(generator1, [collector3]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(() => sendHeartbeat(collector3))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('post + put', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => putGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('post + put move', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => putGenerator(generator1, [collector2]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('put + put', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then(() => putGenerator(generator1, [collector1]))
          .then(() => putGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(done).catch(done);
        });

        it('put + put move', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then(() => putGenerator(generator1, [collector1]))
          .then(() => putGenerator(generator1, [collector2]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 1, updated: 0 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('put move + put move', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then(() => putGenerator(generator1, [collector2]))
          .then(() => putGenerator(generator1, [collector3]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 1, updated: 0 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(() => sendHeartbeat(collector3))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('put move + put move back', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then(() => putGenerator(generator1, [collector2]))
          .then(() => putGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('put + patch', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then(() => putGenerator(generator1, [collector1]))
          .then(() => patchGenerator(generator1))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(done).catch(done);
        });

        it('post + put + patch', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => patchGenerator(generator1))
          .then(() => putGenerator(generator1, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });
      });

      describe('updates to multiple generators', () => {
        it('update', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => postGenerator(generator2, [collector2]))
          .then(() => postGenerator(generator3, [collector3]))
          .then(() => sendHeartbeat(collector1))
          .then(() => sendHeartbeat(collector2))
          .then(() => sendHeartbeat(collector3))
          .then(() => patchGenerator(generator1))
          .then(() => patchGenerator(generator2))
          .then(() => patchGenerator(generator3))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => sendHeartbeat(collector3))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(done).catch(done);
        });

        it('update and move', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => postGenerator(generator2, [collector1]))
          .then(() => postGenerator(generator3, [collector3]))
          .then(() => sendHeartbeat(collector1))
          .then(() => sendHeartbeat(collector2))
          .then(() => sendHeartbeat(collector3))
          .then(() => putGenerator(generator1, [collector1]))
          .then(() => putGenerator(generator2, [collector2]))
          .then(() => putGenerator(generator3, [collector1]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 1, deleted: 1, updated: 1 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(() => sendHeartbeat(collector3))
          .then((res) => expectLengths({ added: 0, deleted: 1, updated: 0 }, res))
          .then(done).catch(done);
        });

      });

      describe('multiple updates to multiple generators', () => {
        it('post then move all twice', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => postGenerator(generator2, [collector2]))
          .then(() => postGenerator(generator3, [collector3]))
          .then(() => putGenerator(generator1, [collector1]))
          .then(() => putGenerator(generator2, [collector1]))
          .then(() => putGenerator(generator3, [collector1]))
          .then(() => putGenerator(generator1, [collector2]))
          .then(() => putGenerator(generator2, [collector2]))
          .then(() => putGenerator(generator3, [collector2]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 3, deleted: 0, updated: 0 }, res))
          .then(() => sendHeartbeat(collector3))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('move all twice', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => postGenerator(generator2, [collector2]))
          .then(() => postGenerator(generator3, [collector3]))
          .then(() => sendHeartbeat(collector1))
          .then(() => sendHeartbeat(collector2))
          .then(() => sendHeartbeat(collector3))
          .then(() => putGenerator(generator1, [collector1]))
          .then(() => putGenerator(generator2, [collector1]))
          .then(() => putGenerator(generator3, [collector1]))
          .then(() => putGenerator(generator1, [collector2]))
          .then(() => putGenerator(generator2, [collector2]))
          .then(() => putGenerator(generator3, [collector2]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 1, updated: 0 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 2, deleted: 0, updated: 1 }, res))
          .then(() => sendHeartbeat(collector3))
          .then((res) => expectLengths({ added: 0, deleted: 1, updated: 0 }, res))
          .then(done).catch(done);
        });

        it('move all - cycle collectors', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1]))
          .then(() => postGenerator(generator2, [collector2]))
          .then(() => postGenerator(generator3, [collector3]))
          .then(() => sendHeartbeat(collector1))
          .then(() => sendHeartbeat(collector2))
          .then(() => sendHeartbeat(collector3))
          .then(() => putGenerator(generator1, [collector2]))
          .then(() => putGenerator(generator2, [collector3]))
          .then(() => putGenerator(generator3, [collector1]))
          .then(() => putGenerator(generator1, [collector3]))
          .then(() => putGenerator(generator2, [collector1]))
          .then(() => putGenerator(generator3, [collector2]))
          .then(() => putGenerator(generator1, [collector1]))
          .then(() => putGenerator(generator2, [collector2]))
          .then(() => putGenerator(generator3, [collector3]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => sendHeartbeat(collector3))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(done).catch(done);
        });

      });

      describe('multiple generators multiple collectors', () => {
        it('update', (done) => {
          Promise.resolve()
          .then(() => postGenerator(generator1, [collector1, collector2]))
          .then(() => postGenerator(generator2, [collector2, collector3]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 2, deleted: 0, updated: 0 }, res))
          .then(() => sendHeartbeat(collector3))
          .then((res) => expectLengths({ added: 1, deleted: 0, updated: 0 }, res))
          .then(() => patchGenerator(generator1))
          .then(() => patchGenerator(generator2))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 2 }, res))
          .then(() => sendHeartbeat(collector3))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 1 }, res))
          .then(() => putGenerator(generator1, [collector2]))
          .then(() => putGenerator(generator2, [collector1, collector2]))
          .then(() => sendHeartbeat(collector1))
          .then((res) => expectLengths({ added: 1, deleted: 1, updated: 0 }, res))
          .then(() => sendHeartbeat(collector2))
          .then((res) => expectLengths({ added: 0, deleted: 0, updated: 2 }, res))
          .then(() => sendHeartbeat(collector3))
          .then((res) => expectLengths({ added: 0, deleted: 1, updated: 0 }, res))
          .then(done).catch(done);
        });
      });
    });

    describe('config changes >', () => {
      it('config ok', (done) => {
        sendHeartbeat(collector1)
        .then((res) => {
          expect(res.body).to.have.property('collectorConfig');
          expect(res.body.collectorConfig)
          .to.have.property('heartbeatIntervalMillis', 15000);
          expect(res.body.collectorConfig)
          .to.have.property('sampleUpsertQueueTimeMillis', 15000);
          expect(res.body.collectorConfig)
          .to.have.property('maxSamplesPerBulkUpsert', 1000);
        })
        .then(done).catch(done);
      });

      it('change config', (done) => {
        config.collector.heartbeatIntervalMillis = 10000;
        sendHeartbeat(collector1)
        .then((res) => {
          expect(res.body).to.have.property('collectorConfig');
          expect(res.body.collectorConfig)
          .to.have.property('heartbeatIntervalMillis', 10000);
          expect(res.body.collectorConfig)
          .to.have.property('sampleUpsertQueueTimeMillis', 15000);
          expect(res.body.collectorConfig)
          .to.have.property('maxSamplesPerBulkUpsert', 1000);
        })
        .then(done).catch(done);
      });
    });

    describe('set lastHeartbeat time >', () => {
      it('', (done) => {
        const timestamp = Date.now();
        sendHeartbeat(collector1, { timestamp })
        .then(() => getCollector(collector1))
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
      let originalVersion = '1.0.0';

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
        sendHeartbeat(collector1, {
          timestamp: Date.now(),
          collectorConfig: {
            osInfo: originalOsInfo,
            processInfo: originalProcessInfo,
            version: originalVersion,
          },
        })
        .then(() => done()).catch(done);
      });

      it('one at a time', (done) => {
        Promise.resolve()
        .then(() => getCollector(collector1))
        .then((res) => {
          expect(res.body.osInfo).to.deep.equal(originalOsInfo);
          expect(res.body.processInfo).to.deep.equal(originalProcessInfo);
          expect(res.body.version).to.equal(originalVersion);
        })
        .then(() =>
          sendHeartbeat(collector1, {
            timestamp: Date.now(),
            collectorConfig: {
              osInfo: changedOsInfo,
            },
          })
        )
        .then(() => getCollector(collector1))
        .then((res) => {
          expect(res.body.osInfo).to.deep.equal(updatedOsInfo);
          expect(res.body.processInfo).to.deep.equal(originalProcessInfo);
          expect(res.body.version).to.equal(originalVersion);
        })
        .then(() =>
          sendHeartbeat(collector1, {
            timestamp: Date.now(),
            collectorConfig: {
              processInfo: changedProcessInfo,
            },
          })
        )
        .then(() => getCollector(collector1))
        .then((res) => {
          expect(res.body.osInfo).to.deep.equal(updatedOsInfo);
          expect(res.body.processInfo).to.deep.equal(updatedProcessInfo);
          expect(res.body.version).to.equal(originalVersion);
        })
        .then(() =>
          sendHeartbeat(collector1, {
            timestamp: Date.now(),
            collectorConfig: {
              version: changedVersion,
            },
          })
        )
        .then(() => getCollector(collector1))
        .then((res) => {
          expect(res.body.osInfo).to.deep.equal(updatedOsInfo);
          expect(res.body.processInfo).to.deep.equal(updatedProcessInfo);
          expect(res.body.version).to.equal(updatedVersion);
        })
        .then(() => done())
        .catch(done);
      });

      it('all at once', (done) => {
        Promise.resolve()
        .then(() => getCollector(collector1))
        .then((res) => {
          expect(res.body.osInfo).to.deep.equal(originalOsInfo);
          expect(res.body.processInfo).to.deep.equal(originalProcessInfo);
          expect(res.body.version).to.equal(originalVersion);
        })
        .then(() =>
          sendHeartbeat(collector1, {
            timestamp: Date.now(),
            collectorConfig: {
              osInfo: changedOsInfo,
              processInfo: changedProcessInfo,
              version: changedVersion,
            },
          })
        )
        .then(() => getCollector(collector1))
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
      let encryptedSG = JSON.parse(JSON.stringify(generator1));
      beforeEach((done) => {
        cryptUtils.encryptSGContextValues(GlobalConfig, encryptedSG, sgt)
        .then(() => done())
        .catch(done);
      });

      it('encryption - api', (done) => {
        const authToken = collectorTokens[collector1.name];
        const timestamp = Date.now();
        const secretKeyColl = authToken + timestamp;

        Promise.resolve()
        .then(() => postGenerator(generator1, [collector1]))
        .then(() => sendHeartbeat(collector1, { timestamp }))
        .then((res) => {
          const reencryptedSG = res.body.generatorsAdded[0];
          expect(reencryptedSG).to.not.equal(undefined);
          expect(reencryptedSG.context.secretInformation)
          .to.not.equal(encryptedSG.secretInformation);
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
  });

  describe('reEncryptSGContextValues >', () => {
    const authToken = 'collectorAuthToken';
    const timestamp = Date.now().toString();

    let encryptedSG;
    beforeEach((done) => {
      cryptUtils.encryptSGContextValues(GlobalConfig, generator1, sgt)
      .then((sg) => {
        encryptedSG = sg;
        encryptedSG.generatorTemplate = sgt;
        done();
      }).catch(done);
    });

    it('when encrypted is set to true in SGT, the related encrypted SG values ' +
      'should be decrypted and encrypted again with given auth token and ' +
      'timestamp.', (done) => {
      let reencryptedSampleGen;
      const secretKeyColl = authToken + timestamp;

      // reencrypt context values
      reEncryptSGContextValues(encryptedSG, authToken, timestamp)
      .then((reencryptedSG) => {
        // verify the reencryptedSG context values
        reencryptedSampleGen = reencryptedSG;
        expect(reencryptedSG).to.not.equal(undefined);
        expect(reencryptedSG.context.secretInformation)
          .to.not.equal(encryptedSG.secretInformation);
        expect(reencryptedSG.context.otherNonSecretInformation)
          .equal(otherNonSecretInformation);
        expect(Object.keys(reencryptedSG)).to.deep
          .equal(Object.keys(encryptedSG));

        // decrypt the reencryptedSG, this would basically happen on collector
        const sg = reencryptedSG;
        const sgt = reencryptedSG.generatorTemplate;
        Object.keys(sgt.contextDefinition).forEach((key) => {
          if (sgt.contextDefinition[key].encrypted && sg.context[key]) {
            sg.context[key] = cryptUtils.decrypt(sg.context[key],
              secretKeyColl, config.encryptionAlgoForCollector);
          }
        });

        return sg;
      })
      .then((decryptedSG) => {
        // verify the decrypted context values
        expect(decryptedSG).to.not.equal(undefined);
        expect(decryptedSG.context.secretInformation)
          .equal(secretInformation);
        expect(decryptedSG.context.otherNonSecretInformation)
          .equal(otherNonSecretInformation);
        expect(Object.keys(decryptedSG)).to.deep
          .equal(Object.keys(reencryptedSampleGen));
        done();
      })
      .catch(done);
    });

    it('error when authToken null', (done) => {
      reEncryptSGContextValues(encryptedSG, null, timestamp)
      .then(() => done(new Error('Validation error should be thrown!')))
      .catch((err) => {
        expect(err.name).to.equal('ValidationError');
        expect(err.explanation).to.equal('Collector authentication token or ' +
          'timestamp not available to encrypt the context values');
        done();
      })
      .catch(done);
    });

    it('error when timestamp null/undefined', (done) => {
      reEncryptSGContextValues(encryptedSG, authToken)
      .then(() => done(new Error('Validation error should be thrown!')))
      .catch((err) => {
        expect(err.name).to.equal('ValidationError');
        expect(err.explanation).to.equal('Collector authentication token or ' +
          'timestamp not available to encrypt the context values');
        done();
      })
      .catch(done);
    });

    it('error when SGT not defined as an attribute of SG', (done) => {
      delete encryptedSG.generatorTemplate;
      reEncryptSGContextValues(encryptedSG, authToken, timestamp)
      .then(() => done(new Error('Validation error should be thrown!')))
      .catch((err) => {
        expect(err.name).to.equal('ValidationError');
        expect(err.explanation).to.equal('Sample generator template not found ' +
          'in sample generator.');
        done();
      })
      .catch(done);
    });

    it('error when key/algo is not present in GlobalConfig', (done) => {
      GlobalConfig.destroy({ truncate: true, force: true })
      .then(() => reEncryptSGContextValues(encryptedSG, authToken, timestamp))
      .then(() => done(new Error('Validation error should be thrown!')))
      .catch((err) => {
        expect(err.name).to.equal('SampleGeneratorContextDecryptionError');
        expect(err.message).to.equal('Unable to decrypt the Sample Generator ' +
          'context data. Please contact your Refocus administrator to set up ' +
          'the encryption algorithm and key to protect the ' +
          'sensitive information in your Sample Generator\'s context');
        done();
      })
      .catch(done);
    });

    it('cannot reencrypt SG context values when invalid algo present in ' +
      'GlobalConfig', (done) => {
      GlobalConfig.update(
        { value: 'aes-256-invalid-algo' },
        { where: { key: dbConstants.SGEncryptionAlgorithm } }
      )
      .then((gc) => reEncryptSGContextValues(encryptedSG, authToken, timestamp))
      .then(() => done(new Error('Validation error should be thrown!')))
      .catch((err) => {
        expect(err.name).to.equal('SampleGeneratorContextDecryptionError');
        expect(err.message).to.equal('Unable to decrypt the Sample Generator ' +
          'context data. Please contact your Refocus administrator to set up ' +
          'the encryption algorithm and key to protect the ' +
          'sensitive information in your Sample Generator\'s context');
        done();
      })
      .catch(done);
    });
  });
});

function startCollector(collector) {
  return api.post('/v1/collectors/start')
  .set('Authorization', userToken)
  .send(collector)
  .expect(constants.httpStatus.OK)
  .endAsync()
  .then((res) => {
    collectorTokens[res.body.name] = res.body.token;
    collector.id = res.body.id;
  });
}

function stopCollector(collector) {
  return api.post(`/v1/collectors/${collector.name}/stop`)
  .set('Authorization', collectorTokens[collector.name])
  .send({})
  .endAsync();
}

function getCollector(collector) {
  return api.get(`/v1/collectors/${collector.name}`)
  .set('Authorization', userToken)
  .endAsync();
}

function postGenerator(gen, collectors, statusCode) {
  if (!statusCode) statusCode = 201;
  if (collectors) {
    gen.collectors = collectors.map(c => c.name);
  } else {
    gen.collectors = undefined;
  }

  return api.post('/v1/generators')
  .set('Authorization', userToken)
  .send(gen)
  .expect(statusCode)
  .endAsync();
}

function patchGenerator(gen, collectors, statusCode) {
  if (!statusCode) statusCode = 200;
  const patchData = { description: 'UPDATED' };
  if (collectors) {
    patchData.collectors = collectors.map(c => c.name);
  }

  return api.patch(`/v1/generators/${gen.name}`)
  .set('Authorization', userToken)
  .send(patchData)
  .expect(statusCode)
  .endAsync();
}

function putGenerator(gen, collectors, statusCode) {
  if (!statusCode) statusCode = 200;
  gen.description += '.';
  if (collectors) {
    gen.collectors = collectors.map(c => c.name);
  } else {
    gen.collectors = undefined;
  }

  return api.put(`/v1/generators/${gen.name}`)
  .set('Authorization', userToken)
  .send(gen)
  .expect(statusCode)
  .endAsync();
}

function sendHeartbeat(collector, body) {
  if (!body) body = { timestamp: Date.now() };
  return api.post(`/v1/collectors/${collector.name}/heartbeat`)
  .set('Authorization', collectorTokens[collector.name])
  .send(body)
  .expect(constants.httpStatus.OK)
  .endAsync();
}

function expectLengths(expected, res) {
  expectGeneratorArray(res);
  const { generatorsAdded, generatorsDeleted, generatorsUpdated } = res.body;
  const { added, deleted, updated } = expected;
  expect(generatorsAdded).to.be.an('array').with.lengthOf(added);
  expect(generatorsDeleted).to.be.an('array').with.lengthOf(deleted);
  expect(generatorsUpdated).to.be.an('array').with.lengthOf(updated);
}

const expectedProps = [
  'aspects', 'collectors', 'connection', 'context',
  'description', 'generatorTemplate', 'helpEmail', 'helpUrl', 'id', 'name',
  'subjectQuery', 'subjects', 'tags',
];
const expectedCtxProps = ['password', 'secretInformation', 'otherNonSecretInformation'];
const expectedSGTProps = [
  'author', 'connection', 'contextDefinition',
  'createdAt', 'createdBy', 'deletedAt', 'description', 'helpEmail', 'helpUrl',
  'id', 'isDeleted', 'isPublished', 'name', 'repository', 'tags', 'transform',
  'updatedAt', 'user', 'version',
];
function expectGeneratorArray(res) {
  const { generatorsAdded, generatorsDeleted, generatorsUpdated } = res.body;
  expect(generatorsAdded).to.be.an('array');
  expect(generatorsDeleted).to.be.an('array');
  expect(generatorsUpdated).to.be.an('array');
  generatorsAdded.forEach((gen) => {
    expect(gen).to.be.an('object').that.has.all.keys(expectedProps);
    expect(gen.context).to.be.an('object').that.has.all.keys(expectedCtxProps);
    expect(gen.generatorTemplate).to.be.an('object').that.has.all.keys(expectedSGTProps);
  });
  generatorsDeleted.forEach((gen) => {
    expect(gen).to.be.an('object').that.has.all.keys(expectedProps);
    expect(gen.context).to.be.an('object').that.has.all.keys(expectedCtxProps);
    expect(gen.generatorTemplate).to.be.an('object').that.has.all.keys('name', 'version');
  });
  generatorsUpdated.forEach((gen) => {
    expect(gen).to.be.an('object').that.has.all.keys(expectedProps);
    expect(gen.context).to.be.an('object').that.has.all.keys(expectedCtxProps);
    expect(gen.generatorTemplate).to.be.an('object').that.has.all.keys(expectedSGTProps);
  });
}

