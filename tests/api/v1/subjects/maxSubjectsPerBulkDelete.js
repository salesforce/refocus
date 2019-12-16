const sinon = require('sinon');
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

describe('test max subjects per bulk delete >', () => {
  let api;
  let token;
  before((done) => {
    testUtils
      .createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
  });

  beforeEach(() => {
    const express = require('../../../../express');
    api = supertest(express.app);
  });

  beforeEach(utils.populateRedis);
  afterEach(utils.forceDelete);
  after(testUtils.forceDeleteUser);

  describe('Max subjects per delete set >', () => {
    const maxSubjects = 2;
    beforeEach(() => {
      sinon
        .stub(subjectController.subject, 'validateBulkDeleteSize')
        .callsFake((subList) => subList <= maxSubjects);
      subjectController.subject.maxSubjectsPerBulkDelete = maxSubjects;
    });

    afterEach(() => {
      subjectController.subject.maxSubjectsPerBulkDelete = null;
      subjectController.subject.validateBulkDeleteSize.restore();
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
  });

  describe('Max subjects per bulk delete not set >', () => {
    it('Upload as many samples as you want :) >', (done) => {
      doBulkDelete(api, token, ['sub1', 'sub2', 'sub3', 'sub4', 'sub5'])
        .then((res) => {
          expect(res.status).to.equal(status.OK);
          done();
        })
        .catch((err) => {
          done(err);
        });
    });
  });
});
