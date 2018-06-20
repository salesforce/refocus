// jscs:disable requirePaddingNewLinesBeforeLineComments
// jscs:disable maximumLineLength
// jscs:disable disallowTrailingWhitespace
/* eslint-disable */

/**
 * Copyright (c) 2018, salesforce.com, inc.
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
const utils = require('./utils');
const constants = require('../../../../api/v1/constants');
const jobQueue = require('../../../../jobQueue/setup').jobQueue;
const jobType = require('../../../../jobQueue/setup').jobType;
const bulkDeleteSubjectsJob = require(
  '../../../../worker/jobs/bulkDeleteSubjectsJob');

describe('tests/api/v1/subjects/bulkDeleteStatus.js', () => {
  let token;
  const AUTHORIZATION = 'Authorization';
  const DELETE_PATH = '/v1/subjects/delete/bulk';

  let parentAndChildIdStore = [];
  let notRelatedIdStore = [];

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

  describe('Create subjects and check status', () => {

    // create parent and child subject
    before((done) => {
      const subjectParent = { name: `${testUtils.namePrefix}ParentName`, isPublished: true, childCount: 1, };
      const subjectChild = { name: `${testUtils.namePrefix}ChildName`, isPublished: true, childCount: 0, };
      Subject.create(subjectParent)
        .then((createdSubjectParent) => {
          subjectChild.parentId = createdSubjectParent.id;
          parentAndChildIdStore.push(createdSubjectParent.id);
          return Subject.create(subjectChild);
        })
        .then((createdSubjectChild) => {
          parentAndChildIdStore.push(createdSubjectChild.id);
          done();
        })
        .catch(done);
    });

    // create not related subjects
    before((done) => {
      const blah = { name: `${testUtils.namePrefix}Blah`, isPublished: true, };
      const foo = { name: `${testUtils.namePrefix}Foo`, isPublished: true, };
      Subject.create(blah)
        .then((createdBlah) => {
          notRelatedIdStore.push(createdBlah.id);
          return Subject.create(foo);
        })
        .then((createdFoo) => {
          notRelatedIdStore.push(createdFoo.id);
          done();
        })
        .catch(done);
    });

    before(utils.populateRedis);

    after(utils.forceDelete);
    after(testUtils.forceDeleteUser);

    it('Must show status with SubjectDeleteConstraintError when delete subject with child', (done) => {
      api.post(DELETE_PATH)
        .set(AUTHORIZATION, token)
        .send(parentAndChildIdStore)
        .expect(constants.httpStatus.OK)
        .then((res) => {
          expect(res.body.jobId).to.not.be.empty;
          return Promise.resolve(res.body.jobId);
        })
        .then((jobId) => {
          setTimeout(() => {
            api.get(`/v1/subjects/delete/bulk/${jobId}/status`)
              .set('Authorization', token)
              .expect(constants.httpStatus.OK)
              .then((res) => {
                expect(res.body.errors).to.not.be.empty;
                expect(res.body.errors[0].name).to.equal('SubjectDeleteConstraintError');
                return done();
              });
          }, 100);
        });
    });

    it('Must show success status', (done) => {
      api.post(DELETE_PATH)
        .set(AUTHORIZATION, token)
        .send(notRelatedIdStore)
        .expect(constants.httpStatus.OK)
        .then((res) => {
          expect(res.body.jobId).to.not.be.empty;
          return Promise.resolve(res.body.jobId);
        })
        .then((jobId) => {
          setTimeout(() => {
            api.get(`/v1/subjects/delete/bulk/${jobId}/status`)
              .set('Authorization', token)
              .expect(constants.httpStatus.OK)
              .then((res) => {
                expect(res.body).to.not.be.empty;
                expect(res.body.status).to.equal('complete');
                return done();
              });
          }, 100);
        });
    });
  });
});
