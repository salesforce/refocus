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

let clock;

/* Admin token is created at Date.now().
Fake test start time =  now - 2000d
User created at fake start time + 1d
Fake now = now - 1000d (or test start time + 1000d)
This setup helps clean teardown and test results, like only delete records
created in this test, do not delete something created before the test like
admin user, only return records created in setup, etc. */

const testStartTime = Date.now() - ms('2000d');
const createUserTime = testStartTime - ms('1d');
const recordCreateTime = testStartTime + ms('1000d');

function fakeTime(time) {
  if (clock && clock.restore) {
    clock.restore();
  }

  clock = sinon.useFakeTimers(time);
}

const modelsToTest = {
  aspects: 'name',
  auditEvents: 'resourceName',
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
  botActions: 'name',
  botData: 'name',
  bots: 'name',
  globalconfig: 'key',
  profiles: 'name',
  users: 'name',
};

let userToken;
let createdResources;
let createdUser;

describe('tests/api/v1/common/createdAtUpdatedAtFilters >', () => {
  before(() => {
    fakeTime(createUserTime);
    return tu.createUserAndToken('someUser')
      .then(({ user, token }) => {
        createdUser = user;
        userToken = token;
      });
  });

  after((done) => tu.forceDeleteUser(done, createUserTime));
  after(() => {
    clock.restore();
    return Promise.resolve();
  });

  Object.entries(modelsToTest).forEach(runFilterTestsForModel);
});

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

function createModelRecord({ filterStr, overrideProps, modelName, util }) {
  const recordCreatedAtTime = recordCreateTime - ms(filterStr);
  fakeTime(recordCreatedAtTime);

  const resourceName = `${tu.namePrefix}-${modelName}-${filterStr.slice(-1)}`;
  overrideProps[modelsToTest[modelName]] = resourceName;
  overrideProps.installedBy = createdUser.id;
  overrideProps.userId = createdUser.id;
  if (modelName === 'botActions') {
    return util.createBasicWithActionName(overrideProps);
  }

  return util.createBasic(overrideProps);
}

function createMultipleRecordsAtDifferentTimes(modelName, nameAttr, util) {
  const overrideProps = {};
  createdResources = [];

  const filterStrings = ['10s', '10m', '10h', '10d'];
  return Promise.mapSeries(filterStrings, (filterStr) => createModelRecord(
      { filterStr, overrideProps, modelName, util })
  )
  .then((results) => {
    createdResources = results;
    fakeTime(recordCreateTime);
  });
}

function getUtilForModel(modelName) {
  return require(`../${modelName}/utils`);
}

function updateRecordsAtDifferentTimes() {
  const filterStrings = ['5s', '5m', '5h', '5d'];
  return Promise.all(createdResources.map((createdObj, index) => {
    const recordUpdatedAtTime = recordCreateTime - ms(filterStrings[index]);
    fakeTime(recordUpdatedAtTime);
    createdObj.changed('updatedAt', true);
    return createdObj.save();
  }));
}

function runFilterTestsForModel([modelName, nameAttr]) {
  const util = getUtilForModel(modelName);

  describe(`${modelName} createdAt/updatedAt query filters >`, () => {
    before(() => createMultipleRecordsAtDifferentTimes(
        modelName, nameAttr, util));
    after((done) => util.forceDelete(done, testStartTime));

    describe('GET, createdAt for specific time period >', () => {
      it('createdAt=-5 seconds', () => {
        const filterString = 'createdAt=-5s';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(0);
          });
      });

      it('createdAt=-50 seconds', () => {
        const filterString = 'createdAt=-50s';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(1);
            expect(res.body[0][nameAttr]).to.equal(`___-${modelName}-s`);
          });
      });

      it('createdAt=-30 minutes', () => {
        const filterString = 'createdAt=-30m';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(2);
            const resultNames = res.body.map((obj) => obj[nameAttr]);
            expect(resultNames).includes(`___-${modelName}-m`);
            expect(resultNames).includes(`___-${modelName}-s`);
          });
      });

      it('createdAt=-5 hours', () => {
        const filterString = 'createdAt=-5h';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(2);
            const resultNames = res.body.map((obj) => obj[nameAttr]);
            expect(resultNames).includes(`___-${modelName}-m`);
            expect(resultNames).includes(`___-${modelName}-s`);
          });
      });

      it('createdAt=-15 hours', () => {
        const filterString = 'createdAt=-15h';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(3);
            const resultNames = res.body.map((obj) => obj[nameAttr]);
            expect(resultNames).includes(`___-${modelName}-m`);
            expect(resultNames).includes(`___-${modelName}-s`);
            expect(resultNames).includes(`___-${modelName}-h`);
          });
      });

      it('createdAt=-100 days', () => {
        const filterString = 'createdAt=-100d';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(4);
            const resultNames = res.body.map((obj) => obj[nameAttr]);
            expect(resultNames).includes(`___-${modelName}-m`);
            expect(resultNames).includes(`___-${modelName}-s`);
            expect(resultNames).includes(`___-${modelName}-h`);
            expect(resultNames).includes(`___-${modelName}-d`);
          });
      });

      it('createdAt=-12345678 seconds', () => {
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

      it('error, invalid query param value, only digits', () => {
        const filterString = 'createdAt=-5';
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

    describe('GET, updatedAt for specific time period >', () => {
      before(() => updateRecordsAtDifferentTimes()
          .then(() => {
            fakeTime(recordCreateTime);
          })
      );

      it('updatedAt=-4 seconds', () => {
        const filterString = 'updatedAt=-4s';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            res.body.forEach((retObj) => {
              expect(new Date(retObj.updatedAt) - new Date(retObj.createdAt))
                .to.be.above(0);
            });
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(0);
          });
      });

      it('updatedAt=-50 seconds', () => {
        const filterString = 'updatedAt=-50s';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            res.body.forEach((retObj) => {
              expect(new Date(retObj.updatedAt) - new Date(retObj.createdAt))
                .to.be.above(0);
            });

            expect(res.body.length).to.equal(1);
            expect(res.body[0][nameAttr]).to.equal(`___-${modelName}-s`);
          });
      });

      it('updatedAt=-30 minutes', () => {
        const filterString = 'updatedAt=-30m';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(2);
            const resultNames = res.body.map((obj) => obj[nameAttr]);
            expect(resultNames).includes(`___-${modelName}-m`);
            expect(resultNames).includes(`___-${modelName}-s`);
          });
      });

      it('updatedAt=-4 hours', () => {
        const filterString = 'updatedAt=-4h';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(2);
            res.body.forEach((retObj) => {
              expect(new Date(retObj.updatedAt) - new Date(retObj.createdAt))
                .to.be.above(0);
            });
            const resultNames = res.body.map((obj) => obj[nameAttr]);
            expect(resultNames).includes(`___-${modelName}-m`);
            expect(resultNames).includes(`___-${modelName}-s`);
          });
      });

      it('updatedAt=-15 hours', () => {
        const filterString = 'updatedAt=-15h';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(3);
            res.body.forEach((retObj) => {
              expect(new Date(retObj.updatedAt) - new Date(retObj.createdAt))
                .to.be.above(0);
            });
            const resultNames = res.body.map((obj) => obj[nameAttr]);
            expect(resultNames).includes(`___-${modelName}-m`);
            expect(resultNames).includes(`___-${modelName}-s`);
            expect(resultNames).includes(`___-${modelName}-h`);
          });
      });

      it('updatedAt=-100 days', () => {
        const filterString = 'updatedAt=-100d';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(4);
            res.body.forEach((retObj) => {
              expect(new Date(retObj.updatedAt) - new Date(retObj.createdAt))
                .to.be.above(0);
            });
            const resultNames = res.body.map((obj) => obj[nameAttr]);
            expect(resultNames).includes(`___-${modelName}-m`);
            expect(resultNames).includes(`___-${modelName}-s`);
            expect(resultNames).includes(`___-${modelName}-h`);
            expect(resultNames).includes(`___-${modelName}-d`);
          });
      });

      it('updatedAt=-12345678 seconds', () => {
        const filterString = 'updatedAt=-12345678s';
        const expectedStatus = constants.httpStatus.OK;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            res.body.forEach((retObj) => {
              expect(new Date(retObj.updatedAt) - new Date(retObj.createdAt))
                .to.be.above(0);
            });
            expect(createdResources.length).equals(4);
            expect(res.body.length).to.equal(4);
          });
      });

      it('error, invalid query param value, non negative', () => {
        const filterString = 'updatedAt=15d';
        const expectedStatus = constants.httpStatus.BAD_REQUEST;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(res.body.errors[0].type).to.equal('Error');
            expect(res.body.errors[0].message).to.equal('Request validation ' +
              'failed: Parameter (updatedAt) does not match required pattern:' +
              ' ^-\\d+[smdh]$');
          });
      });

      it('error, invalid query param value, non integer', () => {
        const filterString = 'updatedAt=-xxd';
        const expectedStatus = constants.httpStatus.BAD_REQUEST;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(res.body.errors[0].type).to.equal('Error');
            expect(res.body.errors[0].message).to.equal('Request validation ' +
              'failed: Parameter (updatedAt) does not match required pattern:' +
              ' ^-\\d+[smdh]$');
          });
      });

      it('error, invalid query param value, invalid trailing char', () => {
        const filterString = 'updatedAt=-5e';
        const expectedStatus = constants.httpStatus.BAD_REQUEST;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(res.body.errors[0].type).to.equal('Error');
            expect(res.body.errors[0].message).to.equal('Request validation ' +
              'failed: Parameter (updatedAt) does not match required pattern:' +
              ' ^-\\d+[smdh]$');
          });
      });

      it('error, invalid query param value, only digits', () => {
        const filterString = 'updatedAt=-5';
        const expectedStatus = constants.httpStatus.BAD_REQUEST;
        return getResources({ modelName, filterString, expectedStatus })
          .then((res) => {
            expect(res.body.errors[0].type).to.equal('Error');
            expect(res.body.errors[0].message).to.equal('Request validation ' +
              'failed: Parameter (updatedAt) does not match required pattern:' +
              ' ^-\\d+[smdh]$');
          });
      });
    });
  });
}
