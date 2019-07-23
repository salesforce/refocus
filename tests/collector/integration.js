/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/collector/integration.js
 *
 * This is a simulation of a full collector setup: one refocus instance
 * and multiple separate collectors. The collector runs in a separate process,
 * time is mocked, and requests are intercepted.
 *
 * To run this, you will need to have the collector source code in the same directory
 * as the refocus project.
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
require('chai').use(require('chai-as-promised')).should();
require('chai-as-promised');
const Promise = require('bluebird');
const ms = require('ms');
const config = require('../../config');
const gu = require('../api/v1/generators/utils');
const tu = require('../testUtils');
const forkUtils = require('./utils/forkUtils');
const u = require('./utils/requestUtils');
const dbConstants = require('../../db/constants');
const missedHeartbeatJob = require('../../clock/scheduledJobs/checkMissedCollectorHeartbeat');
const GlobalConfig = tu.db.GlobalConfig;
const { Subject, Aspect, Generator, GeneratorTemplate, Collector, CollectorGroup } = tu.db;

const coll1 = tu.namePrefix + 'collector1';
const coll2 = tu.namePrefix + 'collector2';
const dataSourceUrl = 'http://www.example.com';

const transformBulk = `
  const samples = [];
  subjects.forEach((sub) => 
    aspects.forEach((asp) =>
      samples.push({
        name: sub.absolutePath + "|" + asp.name,
        value: res.body[sub.name][asp.name] + ctx.ctxVar1,
      })
    )
  );
  return samples;
`;

const transformBySubject = `
  return aspects.map((aspect) => ({
    name: subject.absolutePath + "|" + aspect.name,
    value: res.body[aspect.name] + ctx.ctxVar1,
  }));
`;

const sgtBulk = {
  name: 'sgtBulk',
  version: '1.0.0',
  connection: {
    method: 'GET',
    url: dataSourceUrl,
    bulk: true,
  },
  transform: {
    default: transformBulk,
  },
  contextDefinition: {
    ctxVar1: {
      description: 'var 1',
      required: false,
      default: '',
    },
  },
  isPublished: true,
};

const sgtBySubject = {
  name: 'sgtBySubject',
  version: '1.0.0',
  connection: {
    method: 'GET',
    url: `${dataSourceUrl}/{{subjects[0].name}}`,
    bulk: false,
  },
  transform: {
    default: transformBySubject,
  },
  contextDefinition: {
    ctxVar1: {
      description: 'var 1',
      required: false,
      default: '',
    },
  },
  isPublished: true,
};

let cg1 = { name: `${tu.namePrefix}-cg1`, description: 'test' };
let cg2 = { name: `${tu.namePrefix}-cg2`, description: 'test' };

const gen1 = {
  name: 'generator1',
  generatorTemplate: {
    name: '',
    version: '1.0.0',
  },
  subjectQuery: '?absolutePath=sub1_*',
  aspects: ['asp1'],
  collectorGroup: cg1.name,
  isActive: true,
  intervalSecs: 60,
};

const gen2 = {
  name: 'generator2',
  generatorTemplate: {
    name: '',
    version: '1.0.0',
  },
  subjectQuery: '?absolutePath=sub2_*',
  aspects: ['asp2'],
  collectorGroup: cg2.name,
  isActive: true,
  context: {},
  intervalSecs: 60,
};

const sub1_1 = {
  name: 'sub1_1',
  isPublished: true,
};

const sub1_2 = {
  name: 'sub1_2',
  isPublished: true,
};

const sub1_3 = {
  name: 'sub1_3',
  isPublished: true,
};

const sub2_1 = {
  name: 'sub2_1',
  isPublished: true,
};

const sub2_2 = {
  name: 'sub2_2',
  isPublished: true,
};

const sub2_3 = {
  name: 'sub2_3',
  isPublished: true,
};

const asp1 = {
  isPublished: true,
  name: `asp1`,
  timeout: '30s',
  valueType: 'NUMERIC',
  okRange: [0, 0],
  infoRange: [1, 1],
  warningRange: [2, 2],
  criticalRange: [3, 3],
};

const asp2 = {
  isPublished: true,
  name: `asp2`,
  timeout: '30s',
  valueType: 'NUMERIC',
  okRange: [0, 0],
  infoRange: [1, 1],
  warningRange: [2, 2],
  criticalRange: [3, 3],
};

const collectorController = require('../../api/v1/controllers/collectors');
const subjectController = require('../../api/v1/controllers/subjects');
const sampleController = require('../../api/v1/controllers/samples');

const interceptConfig = {
  Start: {
    controller: collectorController,
    method: 'startCollector',
    path: '/collectors/start',
    collectorNamePath: 'req.body.name',
    expectedInterval: null,
    expectedRequestKeys: ['name', 'version'],
    expectedResponseKeys: [
      'id', 'name', 'lastHeartbeat', 'registered', 'status',
      'version', 'createdAt', 'updatedAt', 'generatorsAdded', 'token',
      'collectorConfig', 'apiLinks',
    ],
  },
  Heartbeat: {
    controller: collectorController,
    method: 'heartbeat',
    path: '/collectors/\\S+/heartbeat',
    collectorNamePath: 'req.swagger.params.key.value',
    expectedInterval: () => config.collector.heartbeatIntervalMillis,
    expectedRequestKeys: ['timestamp', 'collectorConfig'],
    expectedResponseKeys: [
      'collectorConfig', 'generatorsAdded', 'generatorsDeleted',
      'generatorsUpdated',
    ],
  },
  SubjectQuery: {
    controller: subjectController,
    method: 'findSubjects',
    path: '/subjects',
    collectorNamePath: 'req.headers.collector-name',
    expectedInterval: () => Math.max(
      ...[gen1, gen2].map(g => g.intervalSecs * 1000),
    ),
    expectedRequestKeys: null,
    expectedResponseKeys: null,
  },
  BulkUpsert: {
    controller: sampleController,
    method: 'bulkUpsertSample',
    path: '/samples/upsert/bulk',
    collectorNamePath: 'req.headers.collector-name',
    expectedInterval: () => Math.max(
      ...[gen1, gen2].map(g => g.intervalSecs * 1000)
    ),
    expectedRequestKeys: null,
    expectedResponseKeys: null,
  },
  Stop: {
    controller: collectorController,
    method: 'stopCollector',
    path: '/collectors/stop',
    expectedInterval: null,
    expectedRequestKeys: null,
    expectedResponseKeys: null,
  },
};

// set up mock data
const mockData = {
  sub1_1: {
    asp1: '1_1_1',
    asp2: '1_1_2',
  },
  sub1_2: {
    asp1: '1_2_1',
    asp2: '1_2_2',
  },
  sub1_3: {
    asp1: '1_3_1',
    asp2: '1_3_2',
  },
  sub2_1: {
    asp1: '2_1_1',
    asp2: '2_1_2',
  },
  sub2_2: {
    asp1: '2_2_1',
    asp2: '2_2_2',
  },
  sub2_3: {
    asp1: '2_3_1',
    asp2: '2_3_2',
  },
};

const nockConfig = [
  {
    url: 'http://www.example.com',
    method: 'get',
    path: '/',
    status: 200,
    response: mockData,
    headers: { 'Content-Type': 'application/json' },
  },
  ...Object.entries(mockData).map(([subName, data]) => ({
    url: 'http://www.example.com',
    method: 'get',
    path: `/${subName}`,
    status: 200,
    response: data,
    headers: { 'Content-Type': 'application/json' },
  })),
];

u.setupInterception(interceptConfig);

describe('tests/collector/integration.js >', function () {
  this.timeout(10000);

  runTests(sgtBulk);
  runTests(sgtBySubject);

  function runTests(sgt) {
    describe(`${sgt.name} >`, () => {
      before(() => {
        gen1.generatorTemplate.name = sgt.name;
        gen2.generatorTemplate.name = sgt.name;
      });
      before(() => forkUtils.setupMocking(nockConfig));

      before(() =>
        tu.createUserAndToken()
        .then((obj) => {
          u.setToken(obj.token);
          forkUtils.setToken(obj.token);
        })
      );
      after(tu.forceDeleteUser);

      before(() => Promise.all([
        Aspect.create(asp1),
        Aspect.create(asp2),
        Subject.create(sub1_1),
        Subject.create(sub1_2),
        Subject.create(sub1_3),
        Subject.create(sub2_1),
        Subject.create(sub2_2),
        Subject.create(sub2_3),
        GeneratorTemplate.create(sgtBulk),
        GeneratorTemplate.create(sgtBySubject),
        CollectorGroup.create(cg1),
        CollectorGroup.create(cg2),
      ]));
      after(() => tu.forceDeleteAll(
        GeneratorTemplate,
        Aspect,
        Subject,
        CollectorGroup,
      ));

      beforeEach(() => {
        config.collector.heartbeatIntervalMillis = ms('15s');
        config.collector.heartbeatLatencyToleranceMillis = ms('5s');
        config.generatorUpsertToleranceFactor = 1;
        config.generatorMissedUpsertRetries = 3;
      });

      afterEach(() => forkUtils.killAllCollectors());

      afterEach(() => tu.forceDeleteAll(
        Collector,
        Generator,
      ));

      describe('basic >', () => {
        it('from scratch - start collector, then post generator', () =>
          Promise.resolve()
          .then(() => u.doStart(coll1))
          .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1] }))
          .then(() => u.postGenerator(gen1))

          .then(() => u.awaitHeartbeat())
          .then(({ res }) => {
            expect(res.body.generatorsAdded.length).to.equal(1);
            expect(res.body.generatorsAdded[0].name).to.equal(gen1.name);
          })

          .then(() => u.awaitBulkUpsert())
          .then(({ req }) => {
            expect(req.body).to.deep.equal([
              { name: 'sub1_1|asp1', value: '1_1_1' },
              { name: 'sub1_2|asp1', value: '1_2_1' },
              { name: 'sub1_3|asp1', value: '1_3_1' },
            ]);
          })
        );

        describe('existing collector and generators >', () => {
          beforeEach(() =>
            u.doStart(coll1)
            .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1] }))
            .then(() => u.postGenerator(gen1))
            .then(() => forkUtils.doStop(coll1))
          );

          it('existing collector and generators', () =>
            u.doStart(coll1)
            .then(({ res }) => {
              expect(res.body).to.have.property('generatorsAdded').with.lengthOf(1);
            })

            .then(() => Promise.all([
              u.awaitHeartbeat()
              .then(({ res }) => {
                expect(res.body.generatorsAdded.length).to.equal(0);
              }),

              u.awaitSubjectQuery()
              .then(({ req, res }) => {
                expect(req.url)
                .to.equal('/v1/subjects?absolutePath=sub1_*&isPublished=true');
                expect(res.body).to.be.an('array').with.lengthOf(3);
                expect(res.body[0].name).to.equal('sub1_1');
                expect(res.body[1].name).to.equal('sub1_2');
                expect(res.body[2].name).to.equal('sub1_3');
              })
              .then(() => u.awaitBulkUpsert())
              .then(({ req }) => {
                expect(req.body).to.deep.equal([
                  { name: 'sub1_1|asp1', value: '1_1_1' },
                  { name: 'sub1_2|asp1', value: '1_2_1' },
                  { name: 'sub1_3|asp1', value: '1_3_1' },
                ]);
                return Promise.resolve();
              }),
            ]))
          );
        });
      });

      describe('field updates >', () => {
        beforeEach(() =>
          u.doStart(coll1)
          .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1] }))
          .then(() => u.postGenerator(gen1))
          .then(() => forkUtils.doStop(coll1))
        );

        it('subjectQuery updated', () =>
          u.doStart(coll1)
          .then(() => Promise.join(
            u.expectSubjectQuery(
              coll1, '/v1/subjects?absolutePath=sub1_*&isPublished=true'
            ),
            u.expectBulkUpsertSamples(
              coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
            ),
          ))

          .then(() => u.patchGenerator(gen1.name, {
            subjectQuery: '?absolutePath=sub*',
          }))

          .then(() => u.awaitHeartbeat())
          .then(({ res }) => expect(res.body.generatorsUpdated).to.have.lengthOf(1))

          .then(() => Promise.join(
            u.expectSubjectQuery(
              coll1, '/v1/subjects?absolutePath=sub*&isPublished=true'
            ),
            u.expectBulkUpsertSamples(
              coll1, '60s', [
                'sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1',
                'sub2_1|asp1', 'sub2_2|asp1', 'sub2_3|asp1',
              ]
            ),
          ))
        );

        it('aspects updated', () =>
          u.doStart(coll1)
          .then(() => Promise.join(
            u.expectSubjectQuery(coll1,
              '/v1/subjects?absolutePath=sub1_*&isPublished=true'
            ),
            u.expectBulkUpsertSamples(
              coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
            ),
          ))

          .then(() => u.patchGenerator(gen1.name, {
            aspects: ['asp1', 'asp2'],
          }))

          .then(() => u.awaitHeartbeat())
          .then(({ res }) => expect(res.body.generatorsUpdated).to.have.lengthOf(1))

          .then(() => Promise.join(
            u.expectSubjectQuery(coll1,
              '/v1/subjects?absolutePath=sub1_*&isPublished=true'
            ),
            u.expectBulkUpsertSamples(
              coll1, '60s', [
                'sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1',
                'sub1_1|asp2', 'sub1_2|asp2', 'sub1_3|asp2',
              ]
            ),
          ))
        );

        it('interval updated', () =>
          u.doStart(coll1)
          .then(() => Promise.join(
            u.expectSubjectQuery(coll1,
              '/v1/subjects?absolutePath=sub1_*&isPublished=true'
            ),
            u.expectBulkUpsertSamples(
              coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
            ),
          ))

          .then(() => u.patchGenerator(gen1.name, {
            intervalSecs: 120,
          }))

          .then(() => u.awaitHeartbeat())
          .then(({ res }) => expect(res.body.generatorsUpdated).to.have.lengthOf(1))

          .then(() => u.awaitBulkUpsert()) // right after heartbeat
          .then(() => u.awaitBulkUpsert() // 120s later, times out
          .should.eventually.be.rejectedWith(Promise.TimeoutError))

          .then(() => gen1.intervalSecs = 120)  // update the promise timeout
          .then(() => u.awaitBulkUpsert()) // right after heartbeat
          .then(() => u.awaitBulkUpsert()) // 120s later, doesn't timeout
          .then(() => gen1.intervalSecs = 60)  // reset the promise timeout
        );

        it('context updated', () =>
          u.doStart(coll1)
          .then(() => u.expectBulkUpsertSamples(coll1, '60s', [
            { name: 'sub1_1|asp1', value: '1_1_1' },
            { name: 'sub1_2|asp1', value: '1_2_1' },
            { name: 'sub1_3|asp1', value: '1_3_1' },
          ]))

          .then(() => u.patchGenerator(gen1.name, {
            context: { ctxVar1: '-' },
          }))

          .then(() => u.awaitHeartbeat())
          .then(({ res }) => expect(res.body.generatorsUpdated).to.have.lengthOf(1))

          .then(() => u.expectBulkUpsertSamples(coll1, '60s', [
            { name: 'sub1_1|asp1', value: '1_1_1-' },
            { name: 'sub1_2|asp1', value: '1_2_1-' },
            { name: 'sub1_3|asp1', value: '1_3_1-' },
          ]))
        );
      });

      describe('collector config >', () => {
        beforeEach(() =>
          u.doStart(coll1)
          .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1] }))
          .then(() => u.postGenerator(gen1))
          .then(() => forkUtils.doStop(coll1))
        );

        describe('defined in refocus >', () => {
          let interval;
          beforeEach(() => {
            interval = setInterval(
              missedHeartbeatJob.execute,
              config.collector.heartbeatIntervalMillis
            );
          });
          afterEach(() => clearInterval(interval));

          it('heartbeatIntervalMillis', () =>
            u.doStart(coll1)
            .then(() => u.awaitHeartbeat())

            .then(() => u.awaitHeartbeat())
            .then(({ waitTime }) => {
              expect(waitTime).to.equal(ms('15s'));
              config.collector.heartbeatIntervalMillis = ms('50s');
            })

            .then(() => u.awaitHeartbeat())
            .then(({ res }) => expect(res.body.collectorConfig).to.include({
              heartbeatIntervalMillis: ms('50s'),
            }))
            .then(() => u.awaitHeartbeat())

            .then(() => u.awaitHeartbeat())
            .then(({ waitTime }) => {
              expect(waitTime).to.equal(ms('50s'));
            })
          );

          it('heartbeatLatencyToleranceMillis', () =>
            u.doStart(coll1)
            .then(() => u.awaitHeartbeat())

            .then(() => forkUtils.blockHeartbeat(coll1))
            .then(() => forkUtils.tickFor(ms('35s')))
            .then(() => u.getStatus(coll1))
            .then((res) => expect(res.body.status).to.equal('MissedHeartbeat'))
            .then(() => forkUtils.unblockHeartbeat(coll1))

            .then(() => u.awaitHeartbeat())
            .then(() => {
              config.collector.heartbeatLatencyToleranceMillis = ms('30s');
            })

            .then(() => u.awaitHeartbeat())
            .then(({ res }) => expect(res.body.collectorConfig).to.include({
              heartbeatLatencyToleranceMillis: ms('30s'),
            }))

            .then(() => forkUtils.blockHeartbeat(coll1))
            .then(() => forkUtils.tickFor(ms('35s')))
            .then(() => u.getStatus(coll1))
            .then((res) => expect(res.body.status).to.equal('Running'))
            .then(() => forkUtils.unblockHeartbeat(coll1))
            .then(() => u.awaitHeartbeat())

            .then(() => forkUtils.blockHeartbeat(coll1))
            .then(() => forkUtils.tickFor(ms('60s')))
            .then(() => u.getStatus(coll1))
            .then((res) => expect(res.body.status).to.equal('MissedHeartbeat'))
            .then(() => forkUtils.unblockHeartbeat(coll1))
          );

          it('generatorUpsertToleranceFactor', () =>
            u.doStart(coll1)
            .then(() => u.doStart(coll2))
            .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1, coll2] }))
            .then(() => u.awaitHeartbeat(coll1))
            .then(() => u.awaitHeartbeat(coll2))
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
              u.awaitBulkUpsert(coll2)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
            ))

            .then(() => u.stopGenerator(gen1, coll1))
            .then(() => forkUtils.tickFor(ms('3m')))
            .then(() => u.resumeGenerator(gen1, coll1))
            .then(() => Promise.join(
              u.awaitBulkUpsert(coll1)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
            ))

            .then(() => {
              config.generatorUpsertToleranceFactor = 3;
              return u.awaitHeartbeat(coll2);
            })

            .then(() => u.stopGenerator(gen1, coll2))
            .then(() => forkUtils.tickFor(ms('2m')))
            .then(() => u.resumeGenerator(gen1, coll2))
            .then(() => Promise.join(
              u.awaitBulkUpsert(coll1)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
            ))

            .then(() => u.stopGenerator(gen1, coll2))
            .then(() => forkUtils.tickFor(ms('4m')))
            .then(() => u.resumeGenerator(gen1, coll2))
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
              u.awaitBulkUpsert(coll2)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
            ))
            .then(() => u.clearBlocking())
          );
        });

        describe('from collector >', () => {
          it('osInfo/processInfo/version', () => {
            let osInfo;
            let processInfo;
            let version;
            return u.doStart(coll1)
            .then(({ req }) => {
              expect(req.body).to.include.keys('osInfo', 'processInfo', 'version');
              osInfo = req.body.osInfo;
              processInfo = req.body.processInfo;
              version = req.body.version;
            })
            .then(() => u.awaitHeartbeat())
            .then(({ req }) => {
              const conf = req.body.collectorConfig;
              expect(conf).to.have.keys('processInfo', 'osInfo', 'version');
              expect(conf.processInfo).to.have.keys('execPath', 'memoryUsage',
                'uptime', 'version', 'versions');
              processInfo.memoryUsage = conf.processInfo.memoryUsage;
              processInfo.uptime = conf.processInfo.uptime;
            })
            .then(() => u.getCollector(coll1))
            .then((res) => {
              expect(res.body.osInfo).to.deep.equal(osInfo);
              expect(res.body.processInfo).to.deep.equal(processInfo);
              expect(res.body.version).to.deep.equal(version);
            });
          });
        });
      });

      describe('context >', () => {
        before((done) => {
          GlobalConfig.create({
            key: dbConstants.SGEncryptionKey,
            value: '1234567890',
          })
          .then(() => GlobalConfig.create({
            key: dbConstants.SGEncryptionAlgorithm,
            value: 'aes-256-cbc',
          }))
          .then(() => done())
          .catch(done);
        });
        after(() => GlobalConfig.destroy({ truncate: true, force: true }));

        it('context var set', () => {
          const gen4 = JSON.parse(JSON.stringify(gen1));
          gen4.name = 'generator4';
          gen4.context = { ctxVar1: '_' };

          return Promise.resolve()
          .then(() => u.doStart(coll1))
          .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1] }))
          .then(() => u.awaitHeartbeat())
          .then(() => u.postGenerator(gen4))

          .then(() => u.awaitBulkUpsert())
          .then(({ req }) => {
            expect(req.body).to.deep.equal([
              { name: 'sub1_1|asp1', value: '1_1_1_' },
              { name: 'sub1_2|asp1', value: '1_2_1_' },
              { name: 'sub1_3|asp1', value: '1_3_1_' },
            ]);
          });
        });

        it('encrypted context', () => {
          const sgt2 = JSON.parse(JSON.stringify(sgt));
          sgt2.name = 'template2';
          sgt2.contextDefinition.ctxVar1.encrypted = true;

          const gen4 = JSON.parse(JSON.stringify(gen1));
          gen4.name = 'generator4';
          gen4.context = { ctxVar1: '_' };
          gu.createSGtoSGTMapping(sgt2, gen4);

          return GeneratorTemplate.create(sgt2)
          .then(() => u.doStart(coll1))
          .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1] }))
          .then(() => u.awaitHeartbeat())
          .then(() => u.postGenerator(gen4))
          .then(() => u.awaitHeartbeat())
          .then(({ res }) => {
            const ctxVal = res.body.generatorsAdded[0].context.ctxVar1;
            expect(ctxVal).to.be.a('string').with.lengthOf(32);
          })
          .then(() => u.expectBulkUpsertSamples(coll1, '60s', [
            { name: 'sub1_1|asp1', value: '1_1_1_' },
            { name: 'sub1_2|asp1', value: '1_2_1_' },
            { name: 'sub1_3|asp1', value: '1_3_1_' },
          ]));
        });
      });

      describe('with OAuth >', () => {
        function setupNockConfigForOAuth(matchingStatus, token) {
          return forkUtils.setupMocking([
            {
              // return token only if correct details are provided
              url: 'http://www.example.com',
              method: 'post',
              path: '/login',
              matchBody: {
                username: 'testUser',
                password: 'testPassword',
                grant_type: 'password',
                client_id: '11bogus',
                client_secret: '11bogus%^',
              },
              status: 200,
              response: {
                accessToken: token,
              },
              headers: { 'Content-Type': 'application/json' },
            }, {
              // otherwise return unauthorized
              url: 'http://www.example.com',
              method: 'post',
              path: '/login',
              status: 401,
            }, {
              // bulk: return mock response only if correct token is provided
              url: 'http://www.example.com',
              method: 'get',
              path: '/',
              matchHeaders: { Authorization: `Bearer ${token}` },
              status: matchingStatus,
              response: mockData,
              headers: { 'Content-Type': 'application/json' },
            }, {
              // bulk: otherwise return unauthorized
              url: 'http://www.example.com',
              method: 'get',
              path: '/',
              status: 401,
            },
            // by subject: return mock response only if correct token is provided
            ...Object.entries(mockData).map(([subName, data]) => ({
              url: 'http://www.example.com',
              method: 'get',
              path: `/${subName}`,
              matchHeaders: { Authorization: `Bearer ${token}` },
              status: matchingStatus,
              response: data,
              headers: { 'Content-Type': 'application/json' },
            })),
            // by subject: otherwise return unauthorized
            ...Object.entries(mockData).map(([subName, data]) => ({
              url: 'http://www.example.com',
              method: 'get',
              path: `/${subName}`,
              status: 401,
            })),
          ]);
        }

        beforeEach(() => setupNockConfigForOAuth(200, 'eegduygsugfiusguguygyfkufyg'));

        before((done) => {
          GlobalConfig.create({
            key: dbConstants.SGEncryptionKey,
            value: '1234567890',
          })
          .then(() => GlobalConfig.create({
            key: dbConstants.SGEncryptionAlgorithm,
            value: 'aes-256-cbc',
          }))
          .then(() => done())
          .catch(done);
        });
        after(() => GlobalConfig.destroy({ truncate: true, force: true }));

        let connection;
        beforeEach(() => {
          connection = {
            simple_oauth: {
              credentials: {
                client: {
                  id: '11bogus',
                  secret: '11bogus%^',
                },
                auth: {
                  tokenHost: 'http://www.example.com/',
                  tokenPath: '/login',
                },
                options: {
                  bodyFormat: 'json',
                },
              },
              tokenConfig: {
                username: 'testUser',
                password: 'testPassword',
              },
              tokenFormat: 'Bearer {accessToken}',
              method: 'ownerPassword',
            },
          };
        });

        it('basic', () => {
          const gen4 = JSON.parse(JSON.stringify(gen1));
          gen4.name = 'generator4';
          gen4.connection = connection;

          return Promise.resolve()
          .then(() => u.doStart(coll1))
          .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1] }))
          .then(() => u.awaitHeartbeat())
          .then(() => u.postGenerator(gen4))

          .then(() => u.awaitBulkUpsert())
          .then(({ req }) => {
            expect(req.body).to.deep.equal([
              { name: 'sub1_1|asp1', value: '1_1_1' },
              { name: 'sub1_2|asp1', value: '1_2_1' },
              { name: 'sub1_3|asp1', value: '1_3_1' },
            ]);
          });
        });

        it('encrypted', () => {
          const sgt3 = JSON.parse(JSON.stringify(sgt));
          sgt3.name = 'template3';
          sgt3.contextDefinition.username = {
            description: 'username',
            required: true,
            encrypted: true,
          };
          sgt3.contextDefinition.password = {
            description: 'password',
            required: true,
            encrypted: true,
          };

          const gen4 = JSON.parse(JSON.stringify(gen1));
          gen4.name = 'generator4';
          gen4.connection = connection;
          gen4.connection.simple_oauth.tokenConfig = {
            username: '{{username}}',
            password: '{{password}}',
          },
            gen4.context = {
              username: 'testUser',
              password: 'testPassword',
            };
          gu.createSGtoSGTMapping(sgt3, gen4);

          return GeneratorTemplate.create(sgt3)
          .then(() => u.doStart(coll1))
          .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1] }))
          .then(() => u.awaitHeartbeat())
          .then(() => u.postGenerator(gen4))
          .then(() => u.awaitHeartbeat())
          .then(({ res }) => {
            const gen = res.body.generatorsAdded[0];
            const simpleOAuth = gen.connection.simple_oauth;
            expect(simpleOAuth.tokenConfig.username).to.equal('{{username}}');
            expect(simpleOAuth.tokenConfig.password).to.equal('{{password}}');

            expect(gen.context.username).to.be.a('string').with.lengthOf(32);
            expect(gen.context.password).to.be.a('string').with.lengthOf(32);
          })

          .then(() => u.awaitBulkUpsert())
          .then(({ req }) => {
            expect(req.body).to.deep.equal([
              { name: 'sub1_1|asp1', value: '1_1_1' },
              { name: 'sub1_2|asp1', value: '1_2_1' },
              { name: 'sub1_3|asp1', value: '1_3_1' },
            ]);
          });
        });

        it('incorrect password (fails to get token)', () => {
          const gen4 = JSON.parse(JSON.stringify(gen1));
          gen4.name = 'generator4';
          gen4.connection = connection;
          gen4.connection.simple_oauth.tokenConfig.password = '...';

          return Promise.resolve()
          .then(() => u.doStart(coll1))
          .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1] }))
          .then(() => u.awaitHeartbeat())
          .then(() => u.postGenerator(gen4))

          .then(() => u.awaitBulkUpsert())
          .then(({ req }) => {
            expect(req.body).to.deep.equal([
              {
                name: 'sub1_1|asp1',
                messageCode: 'ERROR',
                messageBody: 'Error getting OAuth token (method=ownerPassword ' +
                  'url=http://www.example.com///login): Unauthorized',
                value: 'ERROR',
              },
              {
                name: 'sub1_2|asp1',
                messageCode: 'ERROR',
                messageBody: 'Error getting OAuth token (method=ownerPassword ' +
                  'url=http://www.example.com///login): Unauthorized',
                value: 'ERROR',
              },
              {
                name: 'sub1_3|asp1',
                messageCode: 'ERROR',
                messageBody: 'Error getting OAuth token (method=ownerPassword ' +
                  'url=http://www.example.com///login): Unauthorized',
                value: 'ERROR',
              },
            ]);
          });
        });

        it('only gets token once, uses it for all subsequent requests', () => {
          const gen4 = JSON.parse(JSON.stringify(gen1));
          gen4.name = 'generator4';
          gen4.connection = connection;

          return Promise.resolve()
          .then(() => u.doStart(coll1))
          .then(() => setupNockConfigForOAuth(200, 'eegduygsugfiusguguygyfkufyg'))
          .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1] }))
          .then(() => u.awaitHeartbeat())

          .then(() => forkUtils.expectLogins(coll1, 0))
          .then(() => u.postGenerator(gen4))
          .then(() =>
            u.expectBulkUpsertSamples(
              coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
            )
          )
          .then(() => forkUtils.expectLogins(coll1, 1))

          .then(() =>
            u.expectBulkUpsertSamples(
              coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
            )
          )
          .then(() =>
            u.expectBulkUpsertSamples(
              coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
            )
          )
          .then(() =>
            u.expectBulkUpsertSamples(
              coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
            )
          )
          .then(() =>
            u.expectBulkUpsertSamples(
              coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
            )
          )

          .then(() => forkUtils.expectLogins(coll1, 1));
        });

        it('token expires, requests new one and retries', () => {
          const gen4 = JSON.parse(JSON.stringify(gen1));
          gen4.name = 'generator4';
          gen4.connection = connection;

          return Promise.resolve()
          .then(() => u.doStart(coll1))
          .then(() => setupNockConfigForOAuth(200, 'eegduygsugfiusguguygyfkufyg'))
          .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1] }))
          .then(() => u.awaitHeartbeat())

          .then(() => forkUtils.expectLogins(coll1, 0))
          .then(() => u.postGenerator(gen4))
          .then(() =>
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              )
            )
          .then(() => forkUtils.expectLogins(coll1, 1))

          .then(() =>
            u.expectBulkUpsertSamples(
              coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
            )
          )
          .then(() =>
            u.expectBulkUpsertSamples(
              coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
            )
          )
          .then(() =>
            u.expectBulkUpsertSamples(
              coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
            )
          )
          .then(() =>
            u.expectBulkUpsertSamples(
              coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
            )
          )

          .then(() => forkUtils.expectLogins(coll1, 1))

          .then(() =>
            setupNockConfigForOAuth(200, '12345')
          )
          .then(() => u.awaitBulkUpsert())
          .then(({ req }) => {
            expect(req.body).to.deep.equal([
              { name: 'sub1_1|asp1', value: '1_1_1' },
              { name: 'sub1_2|asp1', value: '1_2_1' },
              { name: 'sub1_3|asp1', value: '1_3_1' },
            ]);
          })

          .then(() => forkUtils.expectLogins(coll1, 2));
        });

        it('no retry if status other than unauthorized', () => {
          const gen4 = JSON.parse(JSON.stringify(gen1));
          gen4.name = 'generator4';
          gen4.connection = connection;

          return Promise.resolve()
          .then(() => u.doStart(coll1))
          .then(() => setupNockConfigForOAuth(200, 'eegduygsugfiusguguygyfkufyg'))
          .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1] }))
          .then(() => u.awaitHeartbeat())

          .then(() => forkUtils.expectLogins(coll1, 0))
          .then(() => u.postGenerator(gen4))
          .then(() => u.awaitBulkUpsert())
          .then(({ req }) => {
            expect(req.body).to.deep.equal([
              { name: 'sub1_1|asp1', value: '1_1_1' },
              { name: 'sub1_2|asp1', value: '1_2_1' },
              { name: 'sub1_3|asp1', value: '1_3_1' },
            ]);
          })
          .then(() => forkUtils.expectLogins(coll1, 1))

          .then(() =>
            setupNockConfigForOAuth(400, 'eegduygsugfiusguguygyfkufyg')
          )
          .then(() => u.awaitBulkUpsert())
          .then(({ req }) => {
            expect(req.body).to.deep.equal([
              {
                name: 'sub1_1|asp1',
                messageCode: 'ERROR',
                messageBody: 'simple-oauth2 (method=ownerPassword): Bad Request ' +
                  `(http://www.example.com${sgt.connection.bulk ? '' : '/sub1_1'})`,
                value: 'ERROR',
              },
              {
                name: 'sub1_2|asp1',
                messageCode: 'ERROR',
                messageBody: 'simple-oauth2 (method=ownerPassword): Bad Request ' +
                  `(http://www.example.com${sgt.connection.bulk ? '' : '/sub1_2'})`,
                value: 'ERROR',
              },
              {
                name: 'sub1_3|asp1',
                messageCode: 'ERROR',
                messageBody: 'simple-oauth2 (method=ownerPassword): Bad Request ' +
                  `(http://www.example.com${sgt.connection.bulk ? '' : '/sub1_3'})`,
                value: 'ERROR',
              },
            ]);
          })

          .then(() => forkUtils.expectLogins(coll1, 1));
        });
      });

      describe('change status >', () => {
        beforeEach(() =>
          u.doStart(coll1)
          .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1] }))
          .then(() => u.postGenerator(gen1))
          .then(() => forkUtils.doStop(coll1))
        );

        describe('with collector commands >', () => {
          it('stop - no more heartbeats', () =>
            Promise.resolve()

            .then(() => u.doStart(coll1))
            .then(() => u.awaitHeartbeat())

            .then(() => forkUtils.doStop(coll1))
            .then(() =>
              u.awaitHeartbeat()
              .should.eventually.be.rejectedWith(Promise.TimeoutError)
            )

            .then(() => u.doStart(coll1))
            .then(() => u.awaitHeartbeat())
          );

          it('pause - heartbeats continue, collection stops', () =>
            Promise.resolve()

            .then(() => u.doStart(coll1))
            .then(() => Promise.join(
              u.awaitHeartbeat(),
              u.awaitBulkUpsert(),
            ))

            .then(() => forkUtils.doPause(coll1))
            .then(() => u.expectHeartbeatStatus(coll1, 'Paused'))
            .then(() => Promise.join(
              u.awaitHeartbeat(),
              u.awaitBulkUpsert()
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
            ))

            .then(() => forkUtils.doResume(coll1))
            .then(() => u.expectHeartbeatStatus(coll1, 'Running'))
            .then(() => Promise.join(
              u.awaitHeartbeat(),
              u.awaitBulkUpsert(),
            ))
          );
        });

        describe('through api >', () => {
          it('stop - no more heartbeats', () =>
            Promise.resolve()

            .then(() => u.doStart(coll1))
            .then(() => u.awaitHeartbeat())

            .then(() => u.postStatus('stop', coll1))
            .then(() => u.expectHeartbeatStatus(coll1, 'Stopped'))
            .then(() =>
              u.awaitHeartbeat()
              .should.eventually.be.rejectedWith(Promise.TimeoutError)
            )
          );

          it('pause - heartbeats continue, collection stops', () =>
            Promise.resolve()

            .then(() => u.doStart(coll1))
            .then(() => Promise.join(
              u.awaitHeartbeat(),
              u.awaitBulkUpsert(),
            ))

            .then(() => u.postStatus('pause', coll1))
            .then(() => u.expectHeartbeatStatus(coll1, 'Paused'))
            .then(() =>
              u.awaitBulkUpsert()
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
            )

            .then(() => u.postStatus('resume', coll1))
            .then(() => u.expectHeartbeatStatus(coll1, 'Running'))
            .then(() =>
              u.awaitBulkUpsert(),
            )
          );
        });
      });

      describe('assignment >', () => {
        describe('generator updated >', () => {
          it('generators created, assigned to collectors', () =>
            Promise.join(
              u.doStart(coll1)
              .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1] }))
              .then(() => u.awaitHeartbeat(coll1)),
              u.doStart(coll2)
              .then(() => u.patchCollectorGroup(cg2.name, { collectors: [coll2] }))
              .then(() => u.awaitHeartbeat(coll2)),
            )

            .then(() => Promise.join(
              u.awaitHeartbeat(coll1)
              .then(() => u.postGenerator(gen1))
              .then(() => u.expectHeartbeatGens(coll1, { added: [gen1] })),
              u.awaitHeartbeat(coll2)
              .then(() => u.postGenerator(gen2))
              .then(() => u.expectHeartbeatGens(coll2, { added: [gen2] })),
            ))

            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
            ))
          );

          it('generator collectorGroup updated, reassigned', () =>
            Promise.join(
              u.doStart(coll1)
              .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1] }))
              .then(() => u.awaitHeartbeat(coll1)),
              u.doStart(coll2)
              .then(() => u.patchCollectorGroup(cg2.name, { collectors: [coll2] }))
              .then(() => u.awaitHeartbeat(coll2)),
            )

            .then(() => Promise.join(
              u.awaitHeartbeat(coll1)
              .then(() => u.postGenerator(gen1))
              .then(() => u.expectHeartbeatGens(coll1, { added: [gen1] })),
              u.awaitHeartbeat(coll2)
              .then(() => u.postGenerator(gen2))
              .then(() => u.expectHeartbeatGens(coll2, { added: [gen2] })),
            ))

            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
            ))

            .then(() => Promise.join(
              u.awaitHeartbeat(coll1),
              u.awaitHeartbeat(coll2),
            ))

            .then(() => {
              const toPut = JSON.parse(JSON.stringify(gen1));
              toPut.collectorGroup = cg2.name;
              return u.putGenerator(toPut);
            })

            .then(() => Promise.join(
              u.expectHeartbeatGens(coll1, { deleted: [gen1] }),
              u.expectHeartbeatGens(coll2, { added: [gen1] }),
            ))

            .then(() => u.awaitBulkUpsert(coll2))
            .then(() => Promise.join(
              u.awaitBulkUpsert(coll1)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
              u.expectBulkUpsertSamples(
                coll2, '60s', [
                  'sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1',
                  'sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2',
                ]
              ),
            ))
          );

          it('collectorGroup collectors updated, reassigned', () =>
            Promise.join(
              u.doStart(coll1)
              .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1] }))
              .then(() => u.awaitHeartbeat(coll1)),
              u.doStart(coll2)
              .then(() => u.awaitHeartbeat(coll2)),
            )

            .then(() => Promise.join(
              u.awaitHeartbeat(coll1)
              .then(() => u.postGenerator(gen1))
              .then(() => u.expectHeartbeatGens(coll1, { added: [gen1] })),
            ))

            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
              u.awaitBulkUpsert(coll2)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
            ))

            .then(() => Promise.join(
              u.awaitHeartbeat(coll1),
              u.awaitHeartbeat(coll2),
            ))

            .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll2] }))

            .then(() => Promise.join(
              u.expectHeartbeatGens(coll1, { deleted: [gen1] }),
              u.expectHeartbeatGens(coll2, { added: [gen1] }),
            ))

            .then(() => u.awaitBulkUpsert(coll2))
            .then(() => Promise.join(
              u.awaitBulkUpsert(coll1)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
            ))
          );

          it('generator activated/deactivated', () =>
            Promise.join(
              u.doStart(coll1)
              .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1] }))
              .then(() => u.awaitHeartbeat(coll1)),
              u.doStart(coll2)
              .then(() => u.patchCollectorGroup(cg2.name, { collectors: [coll2] }))
              .then(() => u.awaitHeartbeat(coll2)),
            )

            .then(() => Promise.join(
              u.awaitHeartbeat(coll1)
              .then(() => u.postGenerator(gen1))
              .then(() => u.expectHeartbeatGens(coll1, { added: [gen1] })),

              u.awaitHeartbeat(coll2)
              .then(() => u.postGenerator(gen2))
              .then(() => u.expectHeartbeatGens(coll2, { added: [gen2] })),
            ))

            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
            ))

            .then(() => u.awaitHeartbeat(coll1))
            .then(() => u.patchGenerator(gen1.name, { isActive: false }))
            .then(() => u.expectHeartbeatGens(coll1, { deleted: [gen1] }))

            .then(() => Promise.join(
              u.awaitBulkUpsert(coll1)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
            ))

            .then(() => u.patchGenerator(gen1.name, { isActive: true }))
            .then(() => u.expectHeartbeatGens(coll1, { added: [gen1] }))
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
            ))
          );
        });

        describe('collector status changed >', () => {
          let interval;
          let _gen2;

          before(() => {
            _gen2 = JSON.parse(JSON.stringify(gen2));
            _gen2.collectorGroup = cg1.name;
          });

          beforeEach(() => {
            interval = setInterval(
              missedHeartbeatJob.execute,
              config.collector.heartbeatIntervalMillis
            );
          });
          afterEach(() => clearInterval(interval));

          beforeEach(() =>
            Promise.resolve()
            .then(() => u.doStart(coll1))
            .then(() => u.doStart(coll2))

            .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1, coll2] }))

            .then(() => u.postGenerator(gen1))
            .then(() => u.postGenerator(_gen2))
          );

          it('started', () =>
            Promise.resolve()
            .then(() => forkUtils.doStop(coll1))
            .then(() => forkUtils.doStop(coll2))

            .then(() => Promise.join(
              u.awaitBulkUpsert(coll1)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
              u.awaitBulkUpsert(coll2)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
            ))

            .then(() => u.doStart(coll1))
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
              u.awaitBulkUpsert(coll2)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
            ))
          );

          it('stopped', () =>
            Promise.resolve()
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
            ))

            .then(() => u.postStatus('Stop', coll1))
            .then(() => u.expectHeartbeatGens(coll2, { added: [gen1] }))

            .then(() => Promise.join(
              u.awaitBulkUpsert(coll1)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
              u.expectBulkUpsertSamples(
                coll2, '60s', [
                  'sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1',
                  'sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2',
                ]
              ),
            ))
          );

          it('pause/resume', () =>
            Promise.resolve()
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
            ))

            .then(() => u.postStatus('Pause', coll1))
            .then(() => Promise.join(
              u.expectHeartbeatStatus(coll1, 'Paused'),
              u.expectHeartbeatGens(coll2, { added: [gen1] }),
            ))

            .then(() => Promise.join(
              u.awaitBulkUpsert(coll1)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
              u.expectBulkUpsertSamples(
                coll2, '60s', [
                  'sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1',
                  'sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2',
                ]
              ),
            ))

            .then(() => u.postStatus('Stop', coll2))
            .then(() => u.expectHeartbeatStatus(coll2, 'Stopped'))
            .then(() => Promise.join(
              u.awaitBulkUpsert(coll1)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
              u.awaitBulkUpsert(coll2)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
            ))

            .then(() => u.postStatus('Resume', coll1))
            .then(() => u.expectHeartbeatGens(coll1, { added: [gen1, gen2] }))
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', [
                  'sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1',
                  'sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2',
                ]
              ),
              u.awaitBulkUpsert(coll2)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
            ))
          );

          it('missed heartbeat', () =>
            Promise.resolve()
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
            ))

            .then(() => forkUtils.blockHeartbeat(coll1))
            .then(() =>
              u.awaitHeartbeat(coll1)
              .should.eventually.be.rejectedWith(Promise.TimeoutError)
            )
            .then(() => Promise.join(
              u.awaitBulkUpsert(coll1)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
              u.expectBulkUpsertSamples(
                coll2, '60s', [
                  'sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1',
                  'sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2',
                ]
              ),
            ))

            .then(() => forkUtils.doStop(coll2))
            .then(() => Promise.join(
              u.awaitBulkUpsert(coll1)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
              u.awaitBulkUpsert(coll2)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
            ))

            .then(() => forkUtils.unblockHeartbeat(coll1))
            .then(() => u.expectHeartbeatGens(coll1, { updated: [gen1] }))
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', [
                  'sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1',
                  'sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2',
                ]
              ),
              u.awaitBulkUpsert(coll2)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
            ))
          );
        });

        describe('missed upsert >', () => {
          let interval;
          let _gen2;

          before(() => {
            _gen2 = JSON.parse(JSON.stringify(gen2));
            _gen2.collectorGroup = cg1.name;
          });

          beforeEach(() => {
            interval = setInterval(
              missedHeartbeatJob.execute,
              config.collector.heartbeatIntervalMillis
            );
          });
          afterEach(() => clearInterval(interval));

          beforeEach(() =>
            Promise.resolve()
            .then(() => Collector.findAll())
            .then(() => CollectorGroup.findAll())
            .then(() => u.doStart(coll1))
            .then(() => u.doStart(coll2))

            .then(() => u.patchCollectorGroup(cg1.name, { collectors: [coll1, coll2] }))

            .then(() => u.postGenerator(gen1))
            .then(() => u.postGenerator(_gen2))
          );
          afterEach(() => u.clearBlocking());

          it('gen misses upsert, reassigned to other collector', () =>
            Promise.resolve()
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
            ))

            .then(() => u.stopGenerator(gen1, coll1))
            .then(() => Promise.join(
              u.awaitBulkUpsert(coll1)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
            ))
            .then(() => Promise.join(
              u.awaitBulkUpsert(coll1)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
              u.expectBulkUpsertSamples(
                coll2, '60s', [
                  'sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1',
                  'sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2',
                ]
              ),
            ))
          );

          it('multiple gens on a single collector, only missed one is reassigned', () =>
            Promise.resolve()
            .then(() => forkUtils.doStop(coll2))
            .then(() => u.awaitHeartbeat(coll2)
            .should.eventually.be.rejectedWith(Promise.TimeoutError))
            .then(() => u.doStart(coll2))
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', [
                  'sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1',
                  'sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2',
                ]
              ),
              u.awaitBulkUpsert(coll2)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
            ))

            .then(() => u.stopGenerator(gen2, coll1))
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
            ))
          );

          it('no other alive collectors - reassigned to same collector', () =>
            Promise.resolve()
            .then(() => forkUtils.doStop(coll2))
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', [
                  'sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1',
                  'sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2',
                ]
              ),
            ))

            .then(() => u.stopGenerator(gen1, coll1))
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
              Promise.resolve()
              .then(() => u.expectHeartbeatGens(coll1, { updated: [] }))
              .then(() => u.expectHeartbeatGens(coll1, { updated: [] }))
              .then(() => u.expectHeartbeatGens(coll1, { updated: [] }))
              .then(() => u.expectHeartbeatGens(coll1, { updated: [] }))
              .then(() => u.expectHeartbeatGens(coll1, { updated: [gen1] }))
            ))
            .then(() => u.resumeGenerator(gen1, coll1))
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', [
                  'sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1',
                  'sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2',
                ]
              ),
            ))
          );

          it('gen with no samples doesnt trigger missed upsert', () =>
            Promise.resolve()
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
            ))
            .then(() => u.patchGenerator(gen1.name, { subjectQuery: '?absolutePath=' }))

            .then(() => Promise.join(
              u.expectBulkUpsertSamples(coll1, '60s', []),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
            ))
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(coll1, '60s', []),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
            ))
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(coll1, '60s', []),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
            ))
          );

          it('if reassigning doesnt fix it, dont keep bouncing around', () =>
            Promise.resolve()
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
            ))

            .then(() => u.stopGenerator(gen1, coll1))
            .then(() => u.stopGenerator(gen1, coll2))
            .then(() => u.expectHeartbeatGens(coll2, { added: [] }))
            .then(() => u.expectHeartbeatGens(coll2, { added: [] }))
            .then(() => u.expectHeartbeatGens(coll2, { added: [] }))
            .then(() => u.expectHeartbeatGens(coll2, { added: [] }))
            .then(() => u.expectHeartbeatGens(coll2, { added: [gen1] }))
            .then(() => u.expectHeartbeatGens(coll1, { added: [gen1] }))
            .then(() => u.expectHeartbeatGens(coll2, { added: [gen1] }))
            .then(() => u.expectHeartbeatGens(coll2, { added: [] }))
            .then(() => u.expectHeartbeatGens(coll1, { added: [] }))
          );

          it('if updating doesnt fix it, dont keep updating', () =>
            Promise.resolve()
            .then(() => forkUtils.doStop(coll2))
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', [
                  'sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1',
                  'sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2',
                ]
              ),
            ))

            .then(() => u.stopGenerator(gen1, coll1))
            .then(() => u.expectHeartbeatGens(coll1, { updated: [] }))
            .then(() => u.expectHeartbeatGens(coll1, { updated: [] }))
            .then(() => u.expectHeartbeatGens(coll1, { updated: [] }))
            .then(() => u.expectHeartbeatGens(coll1, { updated: [] }))
            .then(() => u.expectHeartbeatGens(coll1, { updated: [gen1] }))
            .then(() => u.expectHeartbeatGens(coll1, { updated: [gen1] }))
            .then(() => u.expectHeartbeatGens(coll1, { updated: [gen1] }))
            .then(() => u.expectHeartbeatGens(coll1, { updated: [] }))
            .then(() => u.expectHeartbeatGens(coll1, { updated: [] }))
          );

          it('misses heartbeat and upsert at the same time - reassigned', () =>
            Promise.resolve()
            .then(() => Promise.join(
              u.expectBulkUpsertSamples(
                coll1, '60s', ['sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1']
              ),
              u.expectBulkUpsertSamples(
                coll2, '60s', ['sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2']
              ),
            ))

            .then(() => u.expectHeartbeatGens(coll1, {}))
            .then(() => u.expectHeartbeatGens(coll1, {}))
            .then(() => u.expectHeartbeatGens(coll1, {}))
            .then(() => forkUtils.killCollector(coll1))
            .then(() => u.expectHeartbeatGens(coll2, { added: [] }))
            .then(() => u.expectHeartbeatGens(coll2, { added: [gen1] }))
            .then(() => Promise.join(
              u.awaitBulkUpsert(coll1)
              .should.eventually.be.rejectedWith(Promise.TimeoutError),
              u.expectBulkUpsertSamples(
                coll2, '60s', [
                  'sub1_1|asp1', 'sub1_2|asp1', 'sub1_3|asp1',
                  'sub2_1|asp2', 'sub2_2|asp2', 'sub2_3|asp2',
                ]
              ),
            ))
          );
        });
      });
    });
  }
});

