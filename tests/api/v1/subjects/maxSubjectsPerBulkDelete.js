const supertest = require('supertest');
const subjectController = require('../../../../api/v1/controllers/subjects');
const testUtils = require('../../../testUtils');
const utils = require('./utils');
const expect = require('chai').expect;
const constants = require('../../../../api/v1/constants');
const status = constants.httpStatus;
const AUTHORIZATION = 'Authorization';
const DELETE_PATH = '/v1/subjects/delete/bulk';

/**
 * Deletes some cached versions of files. This allows new
 * environment variables that are set between tests to propogate
 */
function clearRequireCache() {
  delete require.cache[require.resolve('../../../../config.js')];
  delete require.cache[require.resolve('../../../../express')];
  delete require.cache[require
    .resolve('../../../../api/v1/controllers/subjects')];
  delete require.cache[require
    .resolve('../../../../api/v1/helpers/nouns/subjects')];
  delete require.cache[require.resolve('supertest')];
}

/**
 * If an instance of refocus has been started and not torn down in a previous
 * test file this function will tear it down and remove the reference to it.
 */
function tearDownExistingRefocusInstance() {
  const express = require('../../../../express');
  const serverApp = express.serverApp;
  serverApp.close();
  clearRequireCache();
}

/**
 * @param {object} api - api object to perform bulk delete request to
 * @param {string} token - api token
 * @param {array} subKeys - array of keys of subjects to be deleted
 * @returns {object} - response of delete request
 */
function doBulkDelete(api, token, subKeys) {
  return api
    .post(DELETE_PATH)
    .set(AUTHORIZATION, token)
    .send(subKeys);
}

describe('Max subjects per delete set >', () => {
  let app;
  let api;
  let token;
  let serverApp;
  beforeEach(utils.populateRedis);
  afterEach(utils.forceDelete);
  afterEach(testUtils.forceDeleteUser);

  const maxSubjects = '2';
  before((done) => {
    process.env.MAX_SUBJECTS_PER_BULK_DELETE = maxSubjects;
    tearDownExistingRefocusInstance();
    const express = require('../../../../express');
    app = express.app;
    serverApp = express.serverApp;
    api = supertest(app);
    done();
  });

  beforeEach((done) => {
    testUtils
      .createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch((err) => done(err));
  });

  it('Fail, trying to delete too many subjects', (done) => {
    const expectedResponseMessage =
      subjectController.tooManySubjectsErrorMessage + maxSubjects;
    doBulkDelete(api, token, ['sub1', 'sub2', 'sub3'])
      .then((res) => {
        expect(res.status).to.equal(status.BAD_REQUEST);
        expect(res.body).to.not.equal(undefined);
        expect(res.body.errors).to.not.equal(undefined);
        expect(res.body.errors[0]).to.not.equal(undefined);
        expect(res.body.errors[0].message).to.equal(expectedResponseMessage);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('Ok, delete less than max subjects', (done) => {
    doBulkDelete(api, token, ['sub1', 'sub2'])
      .then((res) => {
        expect(res.status).to.equal(status.OK);
        expect(res.body).to.not.equal(undefined);
        expect(res.body.errors).to.equal(undefined);
        done();
      })
      .catch((err) => {
        done(err);
      });
  });

  it('Teardown', (done) => {
    serverApp.close(done);
  });
});

describe('Max subjects per bulk delete not set >', () => {
  let app;
  let api;
  let token;
  let serverApp;
  beforeEach(utils.populateRedis);
  afterEach(utils.forceDelete);
  afterEach(testUtils.forceDeleteUser);

  before((done) => {
    process.env.MAX_SUBJECTS_PER_BULK_DELETE = '';
    clearRequireCache();
    const express = require('../../../../express');
    app = express.app;
    serverApp = express.serverApp;
    api = supertest(app);
    done();
  });

  beforeEach((done) => {
    testUtils
      .createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
  });

  it('Request containing more samples than previous limit returns OK >',
      (done) => {
        doBulkDelete(api, token, ['sub1', 'sub2', 'sub3', 'sub4', 'sub5'])
          .then((res) => {
            expect(res.status).to.equal(status.OK);
            done();
          })
          .catch((err) => {
            done(err);
          });
      });

  it('Teardown', (done) => {
    serverApp.close(done);
  });
});
