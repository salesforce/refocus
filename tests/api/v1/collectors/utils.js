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
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const collectorConfig = require('../../../../config/collectorConfig');
const Generator = tu.db.Generator;
const Collector = tu.db.Collector;
const collectorToCreate =  {
  name: tu.namePrefix + 'Coll',
  description: 'This is my collector description.',
  helpEmail: 'a@bcd.com',
  helpUrl: 'a.bcd.com',
  host: 'a.bcd',
  ipAddress: '127.0.0.1',
  version: '1.0.0',
};

const expectedProps = [
  'aspects', 'collectorId', 'possibleCollectors', 'context', 'createdAt', 'createdBy',
  'currentCollector', 'description', 'generatorTemplate',
  'helpEmail', 'helpUrl', 'id', 'intervalSecs', 'isActive', 'isDeleted', 'name',
  'subjectQuery', 'tags', 'token', 'updatedAt', 'user',
];

const expectedPropsDel = expectedProps.filter((p) => p !== 'token');

const expectedCtxProps = ['password', 'secretInformation',
  'otherNonSecretInformation',
];
const expectedSGTProps = [
  'author', 'connection', 'contextDefinition',
  'createdAt', 'description', 'helpEmail', 'helpUrl',
  'id', 'isDeleted', 'isPublished', 'name', 'repository', 'tags', 'transform',
  'updatedAt', 'version',
];

const interval = collectorConfig.heartbeatIntervalMillis;
const tolerance = collectorConfig.heartbeatLatencyToleranceMillis;

function startCollector(collector, collectorTokens, userToken) {
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

function stopCollector(collector, userToken) {
  return api.post(`/v1/collectors/${collector.name}/stop`)
  .set('Authorization', userToken)
  .send({})
  .endAsync();
}

function pauseCollector(collector, userToken) {
  return api.post(`/v1/collectors/${collector.name}/pause`)
  .set('Authorization', userToken)
  .send({})
  .endAsync();
}

function resumeCollector(collector, userToken) {
  return api.post(`/v1/collectors/${collector.name}/resume`)
  .set('Authorization', userToken)
  .send({})
  .endAsync();
}

function missHeartbeat(collector) {
  const lastHeartbeat = Date.now() - (2 * (interval + tolerance));
  return Collector.update({ lastHeartbeat }, { where: { name: collector.name } })
    .then(() => Collector.checkMissedHeartbeat());
}

function getCollector(userToken, collector) {
  return api.get(`/v1/collectors/${collector.name}`)
  .set('Authorization', userToken)
  .endAsync();
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

  if (collector) {
    gen.isActive = true;
    const possibleCollectors = gen.possibleCollectors;
    gen.possibleCollectors = [collector.name];
    return Generator.createWithCollectors(gen)
    .then((g) => g.updateWithCollectors({ possibleCollectors }));
  }

  gen.collectorId = null;
  return Generator.create(gen);
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

function sendHeartbeat(collector, collectorTokens, body) {
  if (!body) body = { timestamp: Date.now() };
  return api.post(`/v1/collectors/${collector.name}/heartbeat`)
  .set('Authorization', collectorTokens[collector.name])
  .send(body)
  .expect(constants.httpStatus.OK)
  .endAsync();
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
    expect(gen).to.be.an('object').that.has.all.keys(expectedPropsDel);
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
  forceDelete(done) {
    tu.forceDelete(tu.db.Collector, testStartTime)
    .then(() => tu.forceDelete(tu.db.GeneratorTemplate, testStartTime))
    .then(() => tu.forceDelete(tu.db.Generator, testStartTime))
    .then(() => tu.forceDelete(tu.db.Aspect, testStartTime))
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
