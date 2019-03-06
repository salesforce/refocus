/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/common/createdAtUpdatedAtFilters.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const tu = require('../../../testUtils');
const constants = require('../../../../api/v1/constants');
const expect = require('chai').expect;
const Promise = require('bluebird');
const sinon = require('sinon');
const ms = require('ms');
supertest.Test.prototype.end = Promise.promisify(supertest.Test.prototype.end);
supertest.Test.prototype.then = function (resolve, reject) {
  return this.end().then(resolve).catch(reject);
};

const modelsToTest = {
  aspects: 'name',
  auditEvents: 'resourceName',
  botActions: 'name',
  botData: 'name',
  bots: 'name',
  collectorGroups: 'name',
  collectors: 'name',
  events: 'log',
  generators: 'name',
  generatorTemplates: 'name',
  lenses: 'name',
  perspectives: 'name',
  rooms: 'name',
  roomTypes: 'name',
  subjects: 'name',
  users: 'name',
  globalconfig: 'key',
  profiles: 'name',
};

let userToken;
let clock;
let createdResources;

describe('tests/api/v1/common/createdAtUpdatedAtFilters >', () => {
  beforeEach(() => {
    clock = sinon.useFakeTimers();
    return tu.createUserAndToken('mainUser')
      .then(({ user, token }) => {
        userToken = token;
      });
  });

  afterEach(() => clock.restore());
  afterEach(() => tu.forceDeleteAllRecords(tu.db.User)
    .then(() => tu.forceDeleteAllRecords(tu.db.Profile))
    .then(() => tu.forceDeleteAllRecords(tu.db.Token)));

  Object.entries(modelsToTest).forEach(runFilterTestsForModel);
});

function getUtilForModel(modelName) {
  return require(`../${modelName}/utils`);
}

function getResources({ modelName, filterString, expectedStatus }) {
  let path;
  if (modelName === 'botData' || modelName === 'botActions') {
    path = `/v1/${modelName}?botId=${createdResources[0].botId}` +
    `&${filterString}`;
  } else {
    path = `/v1/${modelName}?${filterString}`;
  }

  return api.get(`${path}`)
    .set('Authorization', userToken)
    .expect(expectedStatus);
}

function createModel(modelName, overrideProps, nameAttr, name) {
  const u = getUtilForModel(modelName);
  overrideProps[nameAttr] = name;

  return Promise.resolve()
    .then(() => {
      if (modelName === 'botActions') {
        return u.createBasicWithActionName(overrideProps);
      }

      return u.createBasic(overrideProps);
    });
}

function createMultipleRecordsAtDifferentTimes(modelName, nameAttr) {
  const overrideProps = {};

  // create a record for (now) -10d, -10h, -10m, -10s
  clock.restore();
  const dateNow = Date.now();
  let resourceName;
  createdResources = [];
  const dateMinus10s = dateNow - ms('10s');
  clock = sinon.useFakeTimers(dateMinus10s);
  resourceName = `${tu.namePrefix}-${modelName}-10s`;
  return createModel(modelName, overrideProps, nameAttr, resourceName)
    .then((created10s) => {
      createdResources.push(created10s);
      const dateMinus10m = dateNow - ms('10m');
      clock.restore();
      clock = sinon.useFakeTimers(dateMinus10m);
      resourceName = `${tu.namePrefix}-${modelName}-10m`;
      return createModel(modelName, overrideProps, nameAttr, resourceName);
    })
    .then((created10m) => {
      createdResources.push(created10m);
      const dateMinus10h = dateNow - ms('10h');
      clock.restore();
      clock = sinon.useFakeTimers(dateMinus10h);
      resourceName = `${tu.namePrefix}-${modelName}-10h`;
      return createModel(modelName, overrideProps, nameAttr, resourceName);
    })
    .then((created10h) => {
      createdResources.push(created10h);
      const dateMinus10d = dateNow - ms('10d');
      clock.restore();
      clock = sinon.useFakeTimers(dateMinus10d);
      resourceName = `${tu.namePrefix}-${modelName}-10d`;
      return createModel(modelName, overrideProps, nameAttr, resourceName);
    })
    .then((created10d) => {
      createdResources.push(created10d);
      clock.restore();
      return Promise.resolve();
    });
}

function runFilterTestsForModel([modelName, nameAttr]) {
  const u = getUtilForModel(modelName);

  describe(`${modelName} createdAt >`, () => {
    beforeEach(() => createMultipleRecordsAtDifferentTimes(
        modelName, nameAttr, u
      ));

    afterEach(u.forceDeleteAllRecords);

    describe('GET, test createdAt for specific time period >', () => {
      it('5 seconds', () => {
        const filterString = 'createdAt=-5s';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(0);
          });
      });

      it('50 seconds', () => {
        const filterString = 'createdAt=-50s';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(1);
            expect(res.body[0][nameAttr]).to.equal(`___-${modelName}-10s`);
          });
      });

      it('30 minutes', () => {
        const filterString = 'createdAt=-30m';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(2);
            const resultNames = res.body.map((obj) => obj[nameAttr]);
            expect(resultNames).includes(`___-${modelName}-10m`);
            expect(resultNames).includes(`___-${modelName}-10s`);
          });
      });

      it('5 hours', () => {
        const filterString = 'createdAt=-5h';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(2);
            const resultNames = res.body.map((obj) => obj[nameAttr]);
            expect(resultNames).includes(`___-${modelName}-10m`);
            expect(resultNames).includes(`___-${modelName}-10s`);
          });
      });

      it('15 hours', () => {
        const filterString = 'createdAt=-15h';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(3);
            const resultNames = res.body.map((obj) => obj[nameAttr]);
            expect(resultNames).includes(`___-${modelName}-10m`);
            expect(resultNames).includes(`___-${modelName}-10s`);
            expect(resultNames).includes(`___-${modelName}-10h`);
          });
      });

      it('100 days', () => {
        const filterString = 'createdAt=-100d';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(4);
            const resultNames = res.body.map((obj) => obj[nameAttr]);
            expect(resultNames).includes(`___-${modelName}-10m`);
            expect(resultNames).includes(`___-${modelName}-10s`);
            expect(resultNames).includes(`___-${modelName}-10h`);
            expect(resultNames).includes(`___-${modelName}-10d`);
          });
      });

      it('12345678 seconds', () => {
        const filterString = 'createdAt=-12345678s';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(4);
          });
      });

      it('error, invalid query param value, non negative', () => {
        const filterString = 'createdAt=15d';
        const expectedStatus = constants.httpStatus.BAD_REQUEST;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(res.body.errors[0].type).to.equal('Error');
            expect(res.body.errors[0].message).to.equal('Request validation ' +
              'failed: Parameter (createdAt) does not match required pattern:' +
              ' ^-\\d+[smdh]$');
          });
      });

      it('error, invalid query param value, non integer', () => {
        const filterString = 'createdAt=-xxd';
        const expectedStatus = constants.httpStatus.BAD_REQUEST;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(res.body.errors[0].type).to.equal('Error');
            expect(res.body.errors[0].message).to.equal('Request validation ' +
              'failed: Parameter (createdAt) does not match required pattern:' +
              ' ^-\\d+[smdh]$');
          });
      });

      it('error, invalid query param value, invalid trailing char', () => {
        const filterString = 'createdAt=-5e';
        const expectedStatus = constants.httpStatus.BAD_REQUEST;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(res.body.errors[0].type).to.equal('Error');
            expect(res.body.errors[0].message).to.equal('Request validation ' +
              'failed: Parameter (createdAt) does not match required pattern:' +
              ' ^-\\d+[smdh]$');
          });
      });
    });
  });
}
