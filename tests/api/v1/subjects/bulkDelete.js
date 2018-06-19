// jscs:disable requirePaddingNewLinesBeforeLineComments
// jscs:disable maximumLineLength
// jscs:disable disallowTrailingWhitespace
/* eslint-disable */

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
  let northAmericaId = 0;
  let southAmericaId = 0;
  let europeId = 0;
  let northAmericaName = '';

  before((done) => {
    // Start JobQueue
    jobQueue.process(jobType.BULKDELETESUBJECTS, bulkDeleteSubjectsJob);

    testUtils.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
  });

  describe('Create 3 subjects and delete one', () => {
    before((done) => {
      northAmericaName = `${testUtils.namePrefix}NorthAmerica`;
      const subjectNorthAmerica = { name: northAmericaName, isPublished: true, absolutePath: northAmericaName, };
      const subjectSouthAmerica = { name: `${testUtils.namePrefix}SouthAmerica`, isPublished: false, };
      const subjectEurope = { name: `${testUtils.namePrefix}Europe`, isPublished: false, };
      const aspectTemperature = { name: 'temperature', timeout: '30s', isPublished: true, tags: ['temp'], };
      const aspectHumid = { name: 'humidity', timeout: '30s', isPublished: true, };
      const sample1 = { value: '10' };
      const sample2 = { value: '10' };

      Subject.create(subjectNorthAmerica)
        .then((createdSubjectNorthAmerica) => {
          sample1.subjectId = createdSubjectNorthAmerica.id;
          sample2.subjectId = createdSubjectNorthAmerica.id;
          northAmericaId = createdSubjectNorthAmerica.id;
          return Subject.create(subjectSouthAmerica);
        })
        .then((createdSubjectSouthAmerica) => {
          southAmericaId = createdSubjectSouthAmerica.id;
          return Subject.create(subjectEurope);
        })
        .then((createdEurope) => {
          europeId = createdEurope.id;
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
    before(utils.populateRedis);

    after(utils.forceDelete);
    after(testUtils.forceDeleteUser);

    it('Must throw bad request when send invalid keys', (done) => {
      api.post(DELETE_PATH)
        .set(AUTHORIZATION, token)
        .send('blah')
        .expect(constants.httpStatus.BAD_REQUEST)
        .then(() => done());
    });

    it('Must be able to delete subject N.America by path and EU by ID retrieving current JobId', (done) => {
      api.post(DELETE_PATH)
        .set(AUTHORIZATION, token)
        .send([northAmericaName, europeId])
        .expect(constants.httpStatus.OK)
        .then((res) => expect(res.body.jobId).to.not.be.empty)
        .then(() => {
          // postgres must have '___SouthAmerica'
          setTimeout(() => {
            Subject.findAll()
              .then((res) => {
                expect(res).to.have.length(1);
                expect(res[0].absolutePath).to.equal('___SouthAmerica');
                return done();
              });
          }, 100);
        }).then(() => {
          // Checking via API...
          setTimeout(() => {
            // Must not find north america
            api.get(`/v1/subjects/${northAmericaId}`)
              .set('Authorization', token)
              .expect(constants.httpStatus.NOT_FOUND)
              .then((res) => {
                expect(res.body.errors[0].type).to.equal('ResourceNotFoundError');
              });
            // Must find south america
            api.get(`/v1/subjects/${southAmericaId}`)
              .set('Authorization', token)
              .expect(constants.httpStatus.OK)
              .then((res) => {
                expect(res.body.id).to.equal(southAmericaId);
                return done();
              });
          }, 50);
        });
    });
  });
});
