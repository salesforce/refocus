/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/utils.js
 */
'use strict';  // eslint-disable-line strict
const tu = require('../../../testUtils');
const testStartTime = new Date();
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../express').app);
const status = require('../../../../api/v1/constants').httpStatus;
const collectorConfig = require('../../../../config/collectorConfig');
const Generator = tu.db.Generator;
const Collector = tu.db.Collector;
const collectorToCreate = {
  name: tu.namePrefix + 'Coll',
  description: 'This is my collector description.',
  helpEmail: 'a@bcd.com',
  helpUrl: 'a.bcd.com',
  host: 'a.bcd',
  ipAddress: '127.0.0.1',
  version: '1.0.0',
};

const expectedProps = [
  'aspects', 'collectorId', 'collectorGroup', 'collectorGroupId', 'context', 'createdAt',
  'createdBy', 'currentCollector', 'description', 'generatorTemplate',
  'helpEmail', 'helpUrl', 'id', 'intervalSecs', 'isActive', 'name',
  'subjectQuery', 'tags', 'token', 'updatedAt', 'user',
];

const expectedCtxProps = ['password', 'secretInformation',
  'otherNonSecretInformation',
];
const expectedSGTProps = [
  'author', 'connection', 'contextDefinition',
  'createdAt', 'description', 'helpEmail', 'helpUrl',
  'id', 'isPublished', 'name', 'repository', 'tags', 'transform',
  'updatedAt', 'version',
];

const interval = collectorConfig.heartbeatIntervalMillis;
const tolerance = collectorConfig.heartbeatLatencyToleranceMillis;

function startCollector(collector, collectorTokens, userToken) {
  return api.post('/v1/collectors/start')
  .set('Authorization', userToken)
  .send(collector)
  .expect(status.OK)
  .then((res) => {
    collectorTokens[res.body.name] = res.body.token;
    collector.id = res.body.id;
  });
}

function stopCollector(collector, userToken) {
  return api.post(`/v1/collectors/${collector.name}/stop`)
  .set('Authorization', userToken)
  .send({});
}

function pauseCollector(collector, userToken) {
  return api.post(`/v1/collectors/${collector.name}/pause`)
  .set('Authorization', userToken)
  .send({});
}

function resumeCollector(collector, userToken) {
  return api.post(`/v1/collectors/${collector.name}/resume`)
  .set('Authorization', userToken)
  .send({});
}

function missHeartbeat(collector) {
  const lastHeartbeat = Date.now() - (2 * (interval + tolerance));
  return Collector.update({ lastHeartbeat }, { where: { name: collector.name } })
    .then(() => Collector.checkMissedHeartbeat());
}

function getCollector(userToken, collector) {
  return api.get(`/v1/collectors/${collector.name}`)
  .set('Authorization', userToken);
}

/**
 * Assigns the passed in collector to generator and creates the generator
 * @param  {Object} gen - Generator object
 * @param  {uuid} userId - User id
 * @param  {Object} collector - Collector object
 * @return {Promise} - Resolves to created generator
 */
function createGenerator(gen, userId, collector) {
  gen = JSON.parse(JSON.stringify(gen));
  gen.createdBy = userId;
  gen.isActive = true;

  return Generator.createWithCollectors(gen)
  .then((gen) => gen.update({
    currentCollector: collector || null,
    collectorId: collector && collector.id || null,
  }));
}

function updateGenerator(gen, userToken, collector) {
  gen = JSON.parse(JSON.stringify(gen));
  const updateData = { description: 'UPDATED' };

  if (collector) {
    // mock currentCollector on generator so we don't need to reload
    updateData.currentCollector = collector;

    // store collectorId so that currentCollector will be persisted
    updateData.collectorId = collector.id;
  }

  return Generator.findOne({ where: { name: gen.name } })
  .then((o) => o.update(updateData));
}

function sendHeartbeat({ collector, collName, tokens, token, body }) {
  if (collector && !collName) collName = collector.name;
  if (tokens && !token) token = tokens[collName];
  if (!body) body = {
    timestamp: Date.now(),
    collectorConfig: {
      version: '1.0.0',
    },
  };
  const req = api.post(`/v1/collectors/${collName}/heartbeat`);
  if (token) req.set('Authorization', token);
  return req.send(body);
}

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
    expect(gen.generatorTemplate).to.be.an('object').that.has.all.keys(expectedSGTProps);
  });
  generatorsUpdated.forEach((gen) => {
    expect(gen).to.be.an('object').that.has.all.keys(expectedProps);
    expect(gen.context).to.be.an('object').that.has.all.keys(expectedCtxProps);
    expect(gen.generatorTemplate).to.be.an('object').that.has.all.keys(expectedSGTProps);
  });
}

function expectLengths(expected, res) {
  expect(res.status).to.equal(status.OK);
  expectGeneratorArray(res);
  const { generatorsAdded, generatorsDeleted, generatorsUpdated } = res.body;
  const { added, deleted, updated } = expected;
  expect(generatorsAdded).to.be.an('array').with.lengthOf(added);
  expect(generatorsDeleted).to.be.an('array').with.lengthOf(deleted);
  expect(generatorsUpdated).to.be.an('array').with.lengthOf(updated);
}

/**
 * Return a new copy of a collector object
 * @returns {Object} - collector object
 */
function getCollectorToCreate() {
  return JSON.parse(JSON.stringify(collectorToCreate));
}

module.exports = {
  getBasic(overrideProps={}) {
    if (!overrideProps.name) {
      delete overrideProps.name;
    }

    const defaultProps = JSON.parse(JSON.stringify(collectorToCreate));
    return Object.assign(defaultProps, overrideProps);
  },

  createBasic(overrideProps={}) {
    const toCreate = this.getBasic(overrideProps);
    return tu.db.Collector.create(toCreate);
  },

  forceDelete(done, startTime=testStartTime) {
    tu.forceDelete(tu.db.CollectorGroup, startTime)
    .then(() => tu.forceDelete(tu.db.Collector, startTime))
    .then(() => tu.forceDelete(tu.db.GeneratorTemplate, startTime))
    .then(() => tu.forceDelete(tu.db.Generator, startTime))
    .then(() => tu.forceDelete(tu.db.Aspect, startTime))
    .then(() => done())
    .catch(done);
  },

  expectLengths,
  getCollector,
  getCollectorToCreate,
  updateGenerator,
  pauseCollector,
  createGenerator,
  resumeCollector,
  sendHeartbeat,
  startCollector,
  stopCollector,
  missHeartbeat,

};
