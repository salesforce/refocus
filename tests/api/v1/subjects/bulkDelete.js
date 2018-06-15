/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/subjects/bulkDelete.js
 */
'use strict';
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const testUtils = require('../../../testUtils');
const Subject = testUtils.db.Subject;
const Aspect = testUtils.db.Aspect;
const Sample = testUtils.Sample;
const utils = require('./utils');
const constants = require('../../../../api/v1/constants');

const jobQueue = require('../../../../jobQueue/setup').jobQueue;
const jobType = require('../../../../jobQueue/setup').jobType;
const bulkDeleteSubjectsJob = require(
  '../../../../worker/jobs/bulkDeleteSubjectsJob');

describe('tests/api/v1/subjects/bulkDelete.js', () => {
  let token;
  const AUTHORIZATION = 'Authorization';
  const DELETE_PATH = '/v1/subjects/delete/bulk';
  let subjectId1 = 0;
  let subjectId2 = 0;

  before((done) => {
    jobQueue.process(jobType.BULKDELETESUBJECTS, bulkDeleteSubjectsJob);
    testUtils.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
  });
  before(utils.populateRedis);

  // Populate PG_DB
  beforeEach((done) => {
    const parentName = `${testUtils.namePrefix}NorthAmerica`;
    const subjectNorthAmerica = { name: parentName, isPublished: true,
      absolutePath: parentName,
    };
    const subjectSouthAmerica = {
      name: `${testUtils.namePrefix}SouthAmerica`, isPublished: false,
    };
    const aspectTemperature = {
      name: 'temperature', timeout: '30s', isPublished: true, tags: ['temp'],
    };
    const aspectHumid = {
      name: 'humidity',
      timeout: '30s',
      isPublished: true,
    };
    const sample1 = { value: '10' };
    const sample2 = { value: '10' };

    Subject.create(subjectNorthAmerica)
      .then((createdSubjectNorthAmerica) => {
        sample1.subjectId = createdSubjectNorthAmerica.id;
        sample2.subjectId = createdSubjectNorthAmerica.id;
        subjectId1 = createdSubjectNorthAmerica.id;

        return Subject.create(subjectSouthAmerica);
      })
      .then((createdSubjectSouthAmerica) => {
        subjectId2 = createdSubjectSouthAmerica.id;
        return Aspect.create(aspectHumid);
      })
      .then((createdAspectHumid) => {
        sample1.aspectId = createdAspectHumid.id;
        return Aspect.create(aspectTemperature);
      })
      .then((createdAspectTemperature) => {
        sample2.aspectId = createdAspectTemperature.id;
        return Sample.create(sample1);
      })
      .then(() => Sample.create(sample2))
      .then(() => done())
      .catch(done);
  });

  after(utils.forceDelete);
  after(testUtils.forceDeleteUser);

  describe(`POST ${DELETE_PATH} >`, () => {
    it('Must be able delete when proper request', (done) => {
      api.post(DELETE_PATH)
        .set(AUTHORIZATION, token)
        .send([subjectId1, subjectId2])
        .expect(constants.httpStatus.OK)
        .end(done);
    });

    // it('Must fail with invalid request body', (done) => {
    //   api.post(DELETE_PATH)
    //     .set(AUTHORIZATION, token)
    //     .send('INVALID object')
    //     .expect(constants.httpStatus.BAD_REQUEST)
    //     .end(done);
    // });
  });

  // describe('GET Checking status api', () => {
  //   it('Must be able to retrieve the status with valid request', (done) => {
  //     api.get('/v1/subjects/bulk/1/status')
  //       .set(AUTHORIZATION, token)
  //       .expect(constants.httpStatus.OK)
  //       .end((err, res) => {
  //         if (err) {
  //           return done(err);
  //         }
  //
  //         expect(res.status).to.equal(constants.httpStatus.OK);
  //         expect(res.body.status).to.equal('OK');
  //         return done();
  //       });
  //   });
  //
  //   it('Must fail when invalid job id', (done) => {
  //     api.get('/v1/subjects/bulk/blah/status')
  //       .set(AUTHORIZATION, token)
  //       .expect(constants.httpStatus.BAD_REQUEST)
  //       .end((err, res) => {
  //         if (err) {
  //           return done(err);
  //         }
  //
  //         expect(res.body.errors).is.not.empty;
  //         return done();
  //       });
  //   });
  // });
});
