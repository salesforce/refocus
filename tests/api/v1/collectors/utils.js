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
  'aspects', 'collectors', 'connection', 'context',
  'description', 'generatorTemplate', 'helpEmail', 'helpUrl', 'id', 'name',
  'subjectQuery', 'subjects', 'tags',
];

const expectedCtxProps = ['password', 'secretInformation',
  'otherNonSecretInformation',
];
const expectedSGTProps = [
  'author', 'connection', 'contextDefinition',
  'createdAt', 'createdBy', 'deletedAt', 'description', 'helpEmail', 'helpUrl',
  'id', 'isDeleted', 'isPublished', 'name', 'repository', 'tags', 'transform',
  'updatedAt', 'user', 'version',
];

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

function getCollector(userToken, collector) {
  return api.get(`/v1/collectors/${collector.name}`)
  .set('Authorization', userToken)
  .endAsync();
}

function postGenerator(gen, userToken, collectors, statusCode) {
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

function patchGenerator(gen, userToken, collectors, statusCode) {
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

function putGenerator(gen, userToken, collectors, statusCode) {
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
  patchGenerator,
  pauseCollector,
  postGenerator,
  putGenerator,
  resumeCollector,
  sendHeartbeat,
  startCollector,
  stopCollector,

};
