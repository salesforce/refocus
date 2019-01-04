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
const GlobalConfig = tu.db.GlobalConfig;
const { Subject, Aspect, Generator, GeneratorTemplate, Collector } = tu.db;

const coll1 = tu.namePrefix + 'collector1';
const coll2 = tu.namePrefix + 'collector2';
const dataSourceUrl = 'http://www.example.com';

const transform = `
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

const sgt = {
  name: 'template1',
  version: '1.0.0',
  connection: {
    method: 'GET',
    url: dataSourceUrl,
    bulk: true,
  },
  transform: {
    default: transform,
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

const gen1 = {
  name: 'generator1',
  generatorTemplate: {
    name: 'template1',
    version: '1.0.0',
  },
  subjectQuery: '?absolutePath=sub1',
  aspects: ['asp1'],
  possibleCollectors: [coll1],
  isActive: true,
  intervalSecs: 60,
};

const gen2 = {
  name: 'generator2',
  generatorTemplate: {
    name: 'template1',
    version: '1.0.0',
  },
  subjectQuery: '?absolutePath=sub2',
  aspects: ['asp2'],
  possibleCollectors: [coll2],
  isActive: true,
  context: {},
  intervalSecs: 60,
};

const sub1 = {
  name: 'sub1',
  isPublished: true,
};

const sub2 = {
  name: 'sub2',
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
      'id', 'name', 'lastHeartbeat', 'registered', 'status', 'isDeleted',
      'version', 'createdAt', 'updatedAt', 'createdBy',
      'generatorsAdded', 'token', 'collectorConfig',
      'apiLinks',
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
const mockResponse = {
  sub1: {
    asp1: '1',
    asp2: '2',
  },
  sub2: {
    asp1: '3',
    asp2: '4',
  },
};

const nockConfig = [
  {
    url: 'http://www.example.com',
    method: 'get',
    path: '/',
    status: 200,
    response: mockResponse,
    headers: { 'Content-Type': 'application/json' },
  },
];

u.setupInterception(interceptConfig);
forkUtils.setupMocking(nockConfig);

describe('tests/collector/integration.js >', function () {
  this.timeout(10000);

  before(() =>
    tu.createUserAndToken()
    .then((obj) => {
      u.setToken(obj.token);
      forkUtils.setToken(obj.token);
    })
  );

  before(() => Promise.all([
    Aspect.create(asp1),
    Aspect.create(asp2),
    Subject.create(sub1),
    Subject.create(sub2),
    GeneratorTemplate.create(sgt),
  ]));

  beforeEach(() => {
    config.collector.heartbeatIntervalMillis = ms('15s');
    config.collector.heartbeatLatencyToleranceMillis = ms('5s');
  });

  afterEach(() => forkUtils.killAllCollectors());

  afterEach(() => tu.forceDeleteAll(
    Collector,
    Generator,
  ));

  after(() => tu.forceDeleteAll(
    GeneratorTemplate,
    Aspect,
    Subject,
  ));

  after(tu.forceDeleteUser);

  describe('basic', () => {
    it('from scratch - start collector, then post generator', () =>
      Promise.resolve()
      .then(() => u.doStart(coll1))
      .then(() => u.postGenerator(gen1))

      .then(() => u.awaitHeartbeat())
      .then(({ res }) => {
        expect(res.body.generatorsAdded.length).to.equal(1);
        expect(res.body.generatorsAdded[0].name).to.equal(gen1.name);
      })

      .then(() => u.awaitBulkUpsert())
      .then(({ req }) => {
        expect(req.body).to.deep.equal([
          { name: 'sub1|asp1', value: '1' },
        ]);
      })
    );

    describe('existing collector and generators', () => {
      beforeEach(() =>
        u.doStart(coll1)
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
            expect(req.url).to.equal('/v1/subjects?absolutePath=sub1');
            expect(res.body).to.be.an('array').with.lengthOf(1);
            expect(res.body[0].name).to.equal('sub1');
          })
          .then(() => u.awaitBulkUpsert())
          .then(({ req }) => {
            expect(req.body).to.deep.equal([
              { name: 'sub1|asp1', value: '1' },
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
      .then(() => u.postGenerator(gen1))
      .then(() => forkUtils.doStop(coll1))
    );

    it('subjectQuery updated', () =>
      u.doStart(coll1)
      .then(() => Promise.join(
        u.expectSubjectQuery(coll1, '/v1/subjects?absolutePath=sub1'),
        u.expectBulkUpsertSamples(coll1, '60s', ['sub1|asp1']),
      ))

      .then(() => u.patchGenerator(gen1.name, {
        subjectQuery: '?absolutePath=sub*',
      }))

      .then(() => u.awaitHeartbeat())
      .then(({ res }) => expect(res.body.generatorsUpdated).to.have.lengthOf(1))

      .then(() => Promise.join(
        u.expectSubjectQuery(coll1, '/v1/subjects?absolutePath=sub*'),
        u.expectBulkUpsertSamples(coll1, '60s', ['sub1|asp1', 'sub2|asp1']),
      ))
    );

    it('aspects updated', () =>
      u.doStart(coll1)
      .then(() => Promise.join(
        u.expectSubjectQuery(coll1, '/v1/subjects?absolutePath=sub1'),
        u.expectBulkUpsertSamples(coll1, '60s', ['sub1|asp1']),
      ))

      .then(() => u.patchGenerator(gen1.name, {
        aspects: ['asp1', 'asp2'],
      }))

      .then(() => u.awaitHeartbeat())
      .then(({ res }) => expect(res.body.generatorsUpdated).to.have.lengthOf(1))

      .then(() => Promise.join(
        u.expectSubjectQuery(coll1, '/v1/subjects?absolutePath=sub1'),
        u.expectBulkUpsertSamples(coll1, '60s', ['sub1|asp1', 'sub1|asp2']),
      ))
    );

    it('interval updated', () =>
      u.doStart(coll1)
      .then(() => Promise.join(
        u.expectSubjectQuery(coll1, '/v1/subjects?absolutePath=sub1'),
        u.expectBulkUpsertSamples(coll1, '60s', ['sub1|asp1']),
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
        { name: 'sub1|asp1', value: '1' },
      ]))

      .then(() => u.patchGenerator(gen1.name, {
        context: { ctxVar1: '-' },
      }))

      .then(() => u.awaitHeartbeat())
      .then(({ res }) => expect(res.body.generatorsUpdated).to.have.lengthOf(1))

      .then(() => u.expectBulkUpsertSamples(coll1, '60s', [
        { name: 'sub1|asp1', value: '1-' },
      ]))
    );
  });

  describe('collector config', () => {
    beforeEach(() =>
      u.doStart(coll1)
      .then(() => u.postGenerator(gen1))
      .then(() => forkUtils.doStop(coll1))
    );

    describe('defined in refocus', () => {
      let interval;
      beforeEach(() => {
        setInterval(
          Collector.checkMissedHeartbeat,
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
        .then(() => forkUtils.tick(ms('35s')))
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
        .then(() => forkUtils.tick(ms('35s')))
        .then(() => u.getStatus(coll1))
        .then((res) => expect(res.body.status).to.equal('Running'))
        .then(() => forkUtils.unblockHeartbeat(coll1))
        .then(() => u.awaitHeartbeat())

        .then(() => forkUtils.blockHeartbeat(coll1))
        .then(() => forkUtils.tick(ms('60s')))
        .then(() => u.getStatus(coll1))
        .then((res) => expect(res.body.status).to.equal('MissedHeartbeat'))
        .then(() => forkUtils.unblockHeartbeat(coll1))
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
          expect(conf).to.have.keys('processInfo');
          expect(conf.processInfo).to.have.keys('memoryUsage', 'uptime');
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

  describe('context', () => {
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
      .then(() => u.awaitHeartbeat())
      .then(() => u.postGenerator(gen4))

      .then(() => u.awaitBulkUpsert())
      .then(({ req }) => {
        expect(req.body).to.deep.equal([
          { name: 'sub1|asp1', value: '1_' },
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
      .then(() => u.awaitHeartbeat())
      .then(() => u.postGenerator(gen4))
      .then(() => u.awaitHeartbeat())
      .then(({ res }) => {
        const ctxVal = res.body.generatorsAdded[0].context.ctxVar1;
        expect(ctxVal).to.be.a('string').with.lengthOf(32);
      })
      .then(() => u.expectBulkUpsertSamples(coll1, '60s', [
        { name: 'sub1|asp1', value: '1_' },
      ]));
    });
  });

  describe('with OAuth', () => {
    let nockConfig;
    beforeEach(() => {
      nockConfig = [
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
            accessToken: 'eegduygsugfiusguguygyfkufyg',
          },
          headers: { 'Content-Type': 'application/json' },
        }, {
          // otherwise return unauthorized
          url: 'http://www.example.com',
          method: 'post',
          path: '/login',
          status: 401,
        }, {
          // return mock response only if correct token is provided
          url: 'http://www.example.com',
          method: 'get',
          path: '/',
          matchHeaders: { Authorization: 'Bearer eegduygsugfiusguguygyfkufyg' },
          status: 200,
          response: mockResponse,
          headers: { 'Content-Type': 'application/json' },
        }, {
          // otherwise return unauthorized
          url: 'http://www.example.com',
          method: 'get',
          path: '/',
          status: 401,
        },
      ];
    });

    beforeEach(() => forkUtils.setupMocking(nockConfig));

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
      .then(() => u.awaitHeartbeat())
      .then(() => u.postGenerator(gen4))

      .then(() => u.awaitBulkUpsert())
      .then(({ req }) => {
        expect(req.body).to.deep.equal([
          { name: 'sub1|asp1', value: '1' },
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
          { name: 'sub1|asp1', value: '1' },
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
      .then(() => u.awaitHeartbeat())
      .then(() => u.postGenerator(gen4))

      .then(() =>
        u.awaitBulkUpsert()
        .should.eventually.be.rejectedWith(Promise.TimeoutError)
      );
    });

    it('token expires, requests new one and retries', () => {
      const gen4 = JSON.parse(JSON.stringify(gen1));
      gen4.name = 'generator4';
      gen4.connection = connection;

      return Promise.resolve()
      .then(() => u.doStart(coll1))
      .then(() => u.awaitHeartbeat())
      .then(() => u.postGenerator(gen4))

      .then(() => u.awaitBulkUpsert())
      .then(({ req }) => {
        expect(req.body).to.deep.equal([
          { name: 'sub1|asp1', value: '1' },
        ]);
      })

      .then(() => {
        nockConfig[2].matchHeaders.Authorization = 'Bearer 12345';
        nockConfig[0].response.accessToken = '12345';
        forkUtils.setupMocking(nockConfig);
      })
      .then(() => u.awaitBulkUpsert())
      .then(({ req }) => {
        expect(req.body).to.deep.equal([
          { name: 'sub1|asp1', value: '1' },
        ]);
      });
    });

    it('no retry if status other than unauthorized', () => {
      const gen4 = JSON.parse(JSON.stringify(gen1));
      gen4.name = 'generator4';
      gen4.connection = connection;

      return Promise.resolve()
      .then(() => u.doStart(coll1))
      .then(() => u.awaitHeartbeat())
      .then(() => u.postGenerator(gen4))

      .then(() => u.awaitBulkUpsert())
      .then(({ req }) => {
        expect(req.body).to.deep.equal([
          { name: 'sub1|asp1', value: '1' },
        ]);
      })

      .then(() => {
        nockConfig[2].matchHeaders.Authorization = 'Bearer 12345';
        nockConfig[0].response.accessToken = '12345';
        nockConfig[3].status = 400;
        forkUtils.setupMocking(nockConfig);
      })
      .then(() => u.awaitBulkUpsert())
      .then(({ req }) => {
        expect(req.body).to.deep.equal([
          {
            name: 'sub1|asp1',
            value: 'ERROR',
            messageCode: 'ERROR',
            messageBody: 'http://www.example.com returned HTTP status 400: undefined',
          },
        ]);
      });
    });
  });

  describe('change status >', () => {
    beforeEach(() =>
      u.doStart(coll1)
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
      beforeEach(() => {
        gen1.possibleCollectors = [coll1];
        gen2.possibleCollectors = [coll2];
      });

      it('generators created, assigned to collectors', () =>
        Promise.join(
          u.doStart(coll1)
          .then(() => u.awaitHeartbeat(coll1)),
          u.doStart(coll2)
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
          u.expectBulkUpsertSamples(coll1, '60s', ['sub1|asp1']),
          u.expectBulkUpsertSamples(coll2, '60s', ['sub2|asp2']),
        ))
      );

      it('generator possibleCollectors updated, reassigned', () =>
        Promise.join(
          u.doStart(coll1)
          .then(() => u.awaitHeartbeat(coll1)),
          u.doStart(coll2)
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
          u.expectBulkUpsertSamples(coll1, '60s', ['sub1|asp1']),
          u.expectBulkUpsertSamples(coll2, '60s', ['sub2|asp2']),
        ))

        .then(() => Promise.join(
          u.awaitHeartbeat(coll1),
          u.awaitHeartbeat(coll2),
        ))

        .then(() => {
          gen1.possibleCollectors = [coll2];
          return u.putGenerator(gen1);
        })

        .then(() => Promise.join(
          u.expectHeartbeatGens(coll1, { deleted: [gen1] }),
          u.expectHeartbeatGens(coll2, { added: [gen1] }),
        ))

        .then(() => u.awaitBulkUpsert(coll2))
        .then(() => Promise.join(
          u.awaitBulkUpsert(coll1)
          .should.eventually.be.rejectedWith(Promise.TimeoutError),
          u.expectBulkUpsertSamples(coll2, '60s', ['sub1|asp1'], ['sub2|asp2']),
        ))
      );

      it('generator activated/deactivated', () =>
        Promise.join(
          u.doStart(coll1)
          .then(() => u.awaitHeartbeat(coll1)),
          u.doStart(coll2)
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
          u.expectBulkUpsertSamples(coll1, '60s', ['sub1|asp1']),
          u.expectBulkUpsertSamples(coll2, '60s', ['sub2|asp2']),
        ))

        .then(() => u.awaitHeartbeat(coll1))
        .then(() => u.patchGenerator(gen1.name, { isActive: false }))
        .then(() => u.expectHeartbeatGens(coll1, { deleted: [gen1] }))

        .then(() => Promise.join(
          u.awaitBulkUpsert(coll1)
          .should.eventually.be.rejectedWith(Promise.TimeoutError),
          u.expectBulkUpsertSamples(coll2, '60s', ['sub2|asp2']),
        ))

        .then(() => u.patchGenerator(gen1.name, { isActive: true }))
        .then(() => u.expectHeartbeatGens(coll1, { added: [gen1] }))
        .then(() => Promise.join(
          u.expectBulkUpsertSamples(coll1, '60s', ['sub1|asp1']),
          u.expectBulkUpsertSamples(coll2, '60s', ['sub2|asp2']),
        ))
      );
    });

    describe('collector status changed >', () => {
      beforeEach(() => {
        gen1.possibleCollectors = [coll1, coll2];
        gen2.possibleCollectors = [coll2];
      });
      afterEach(() => {
        gen1.possibleCollectors = [coll1];
        gen2.possibleCollectors = [coll2];
      });

      let interval;
      beforeEach(() => {
        setInterval(
          Collector.checkMissedHeartbeat,
          config.collector.heartbeatIntervalMillis
        );
      });
      afterEach(() => clearInterval(interval));

      beforeEach(() =>
        Promise.resolve()
        .then(() => u.doStart(coll1))
        .then(() => u.doStart(coll2))

        .then(() => u.postGenerator(gen1))
        .then(() => u.postGenerator(gen2))

        .then(() => forkUtils.doStop(coll2))
        .then(() => forkUtils.doStop(coll1))
      );

      it('started', () =>
        u.doStart(coll1)
        .then(() => u.awaitHeartbeat(coll1))
        .then(() => Promise.join(
          u.expectBulkUpsertSamples(coll1, '60s', ['sub1|asp1']),
          u.awaitBulkUpsert(coll2)
          .should.eventually.be.rejectedWith(Promise.TimeoutError),
        ))

        .then(() => u.doStart(coll2))
        .then(() => Promise.join(
          u.expectBulkUpsertSamples(coll1, '60s', ['sub1|asp1']),
          u.expectBulkUpsertSamples(coll2, '60s', ['sub2|asp2']),
        ))
      );

      it('stopped', () =>
        Promise.resolve()
        .then(() => u.doStart(coll1))
        .then(() => u.doStart(coll2))

        .then(() => Promise.join(
          u.expectBulkUpsertSamples(coll1, '60s', ['sub1|asp1']),
          u.expectBulkUpsertSamples(coll2, '60s', ['sub2|asp2']),
        ))

        .then(() => u.postStatus('Stop', coll1))
        .then(() => u.expectHeartbeatGens(coll2, { added: [gen1] }))

        .then(() => Promise.join(
          u.awaitBulkUpsert(coll1)
          .should.eventually.be.rejectedWith(Promise.TimeoutError),
          u.expectBulkUpsertSamples(coll2, '60s', ['sub1|asp1'], ['sub2|asp2']),
        ))
      );

      it('pause/resume', () =>
        Promise.resolve()
          .then(() => u.doStart(coll1))
          .then(() => u.doStart(coll2))

        .then(() => Promise.join(
          u.expectBulkUpsertSamples(coll1, '60s', ['sub1|asp1']),
          u.expectBulkUpsertSamples(coll2, '60s', ['sub2|asp2']),
        ))

        .then(() => u.postStatus('Pause', coll1))
        .then(() => Promise.join(
          u.expectHeartbeatStatus(coll1, 'Paused'),
          u.expectHeartbeatGens(coll2, { added: [gen1] }),
        ))

        .then(() => Promise.join(
          u.awaitBulkUpsert(coll1)
          .should.eventually.be.rejectedWith(Promise.TimeoutError),
          u.expectBulkUpsertSamples(coll2, '60s', ['sub1|asp1'], ['sub2|asp2']),
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
        .then(() => u.expectHeartbeatGens(coll1, { added: [gen1] }))
        .then(() => Promise.join(
          u.expectBulkUpsertSamples(coll1, '60s', ['sub1|asp1']),
          u.awaitBulkUpsert(coll2)
          .should.eventually.be.rejectedWith(Promise.TimeoutError),
        ))
      );

      it('missed heartbeat', () =>
        Promise.resolve()
        .then(() => u.doStart(coll1))
        .then(() => u.doStart(coll2))

        .then(() => Promise.join(
          u.expectBulkUpsertSamples(coll1, '60s', ['sub1|asp1']),
          u.expectBulkUpsertSamples(coll2, '60s', ['sub2|asp2']),
        ))

        .then(() => forkUtils.blockHeartbeat(coll1))
        .then(() =>
          u.awaitHeartbeat(coll1)
          .should.eventually.be.rejectedWith(Promise.TimeoutError)
        )
        .then(() => Promise.join(
          u.awaitBulkUpsert(coll1)
          .should.eventually.be.rejectedWith(Promise.TimeoutError),
          u.expectBulkUpsertSamples(coll2, '60s', ['sub1|asp1'], ['sub2|asp2']),
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
          u.expectBulkUpsertSamples(coll1, '60s', ['sub1|asp1']),
          u.awaitBulkUpsert(coll2)
          .should.eventually.be.rejectedWith(Promise.TimeoutError),
        ))
      );
    });
  });
});

