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
const api = supertest(require('../../../../express').app);
const testUtils = require('../../../testUtils');
const Subject = testUtils.db.Subject;
const utils = require('./utils');
const constants = require('../../../../api/v1/constants');
const jobSetup = require('../../../../jobQueue/setup');
const jobQueueKue = jobSetup.jobQueue;
const bulkDelSubQueue = jobSetup.bulkDelSubQueue;
const jobType = jobSetup.jobType;
const status = constants.httpStatus;
const bulkDeleteSubjectsJob = require(
  '../../../../worker/jobs/bulkDeleteSubjects');
const Promise = require('bluebird');
const featureToggles = require('feature-toggles');
const queueTestUtils = require('../../../jobQueue/v1/utils');
supertest.Test.prototype.end = Promise.promisify(supertest.Test.prototype.end);
supertest.Test.prototype.then = function (resolve, reject) {
  return this.end().then(resolve).catch(reject);
};

function testBulkDeleteSubjects(jobStatus) {
  let token;
  let user2;
  let token2;
  const AUTHORIZATION = 'Authorization';
  const DELETE_PATH = '/v1/subjects/delete/bulk';
  const TIMEOUT = 100;

  before((done) => {
    testUtils.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      }).catch(done);
  });

  before(() =>
    testUtils.createSecondUser()
      .then((createdUser) => {
        user2 = createdUser;
        return testUtils.createTokenFromUserName(user2.name);
      })
      .then((createdToken) => {
        token2 = createdToken;
      })
  );

  describe('Create subjects and check status', () => {
    before(() => {
      testUtils.toggleOverride('enableWorkerProcess', true);
      testUtils.toggleOverride('enableApiActivityLogs', false);
      testUtils.toggleOverride('enableWorkerActivityLogs', false);
    });
    before(() => jobSetup.resetJobQueue());
    after(() => jobSetup.resetJobQueue());
    after(() => {
      testUtils.toggleOverride('enableWorkerProcess', false);
    });

    // Start JobQueue, with the option to simulate a failed job
    let simulateFailure = false;
    before(() => {
      if (featureToggles.isFeatureEnabled('enableBullForBulkDelSubj') &&
        featureToggles.isFeatureEnabled('anyBullEnabled')) {
        bulkDelSubQueue.process((job, done) => {
          if (simulateFailure) {
            done(new Error('Job Failed'));
          } else {
            bulkDeleteSubjectsJob(job, done);
          }
        });
      } else {
        jobQueueKue.process(jobType.bulkDeleteSubjects, (job, done) => {
          if (simulateFailure) {
            done('Job Failed');
          } else {
            bulkDeleteSubjectsJob(job, done);
          }
        });
      }
    });

    const blah = { name: `${testUtils.namePrefix}Blah`, isPublished: true, };
    const foo = { name: `${testUtils.namePrefix}Foo`, isPublished: true, };
    const parent = { name: `${testUtils.namePrefix}ParentName`,
      isPublished: true, childCount: 1, };
    const child = { name: `${testUtils.namePrefix}ChildName`,
      isPublished: true, childCount: 0, };
    const restricted = { name: `${testUtils.namePrefix}Restricted`, isPublished: true, };

    // Create parent and child subject (not able to delete)
    beforeEach((done) => {
      Subject.create(parent)
        .then((createdSubjectParent) => {
          child.parentId = createdSubjectParent.id;
          parent.id = createdSubjectParent.id;
          return Subject.create(child);
        })
        .then((createdSubjectChild) => {
          child.id = createdSubjectChild.id;
          done();
        }).catch(done);
    });

    // Create not related subjects (able to delete)
    beforeEach((done) => {
      Subject.create(blah)
        .then((createdBlah) => {
          blah.id = createdBlah.id;
          return Subject.create(foo);
        })
        .then((createdFoo) => {
          foo.id = createdFoo.id;
          done();
        }).catch(done);
    });

    beforeEach(() =>
      Subject.create(restricted)
        .then((created) => {
          restricted.id = created.id;
          return created.addWriter(user2);
        })
    );

    beforeEach(utils.populateRedis);
    afterEach(utils.forceDelete);
    after(testUtils.forceDeleteUser);
    after(() => testUtils.toggleOverride('enableWorkerProcess', false));

    function doBulkDelete(subKeys) {
      return api.post(DELETE_PATH)
        .set(AUTHORIZATION, token)
        .send(subKeys)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          expect(res.body.jobId).to.not.be.empty;
          return res.body.jobId;
        })
        .end();
    }

    function wait(timeout) {
      return new Promise((resolve) => setTimeout(resolve, timeout));
    }

    function getStatus(jobId) {
      return wait(TIMEOUT)
        .then(() =>
          api.get(`/v1/subjects/delete/bulk/${jobId}/status`)
            .set('Authorization', token)
            .expect(constants.httpStatus.OK)
            .end()
        )
        .then((res) => {
          if (res.body.status === 'active') {
            return getStatus(jobId);
          } else {
            return res;
          }
        });
    }

    function checkJobStatus({ jobId, expectedStatus, expectedErrors, expectedError }) {
      return getStatus(jobId)
        .then((res) => {
          expect(res.body.status).to.equal(expectedStatus);

          if (expectedErrors) {
            expect(res.body.errors).to.exist;
            expect(res.body.errors).to.be.an('array');
            res.body.errors.forEach(e => expect(e).to.be.an('object'));
            const errNames = res.body.errors.map((e) => e.name);
            expect(errNames).to.deep.equal(expectedErrors);
          } else {
            expect(res.body.errors).to.not.exist;
          }

          if (expectedError) {
            expect(res.body.error).to.exist;
            expect(res.body.error).to.equal(expectedError);
          } else {
            expect(res.body.error).to.not.exist;
          }
        });
    }

    function checkSubjectsExist(expectMap) {
      return Promise.all(
        Object.keys(expectMap).map((key) => {
          const expectExists = expectMap[key];
          const expectedStatus = expectExists ? status.OK : status.NOT_FOUND;
          return api.get(`/v1/subjects/${key}`)
            .set('Authorization', token)
            .expect(expectedStatus)
            .expect((res) => {
              if (expectExists) {
                expect(res.body.id).to.equal(key);
              } else {
                expect(res.body.errors[0].type).to.equal('ResourceNotFoundError');
              }
            })
            .end();
        })
      );
    }

    it('delete by id', () =>
      doBulkDelete([blah.id, foo.id])

      // { status: 'complete' }
        .then((res) => checkJobStatus({
          jobId: res.body.jobId,
          expectedStatus: jobStatus.complete,
        }))

        // "Blah" and "Foo" were deleted
        .then(() => checkSubjectsExist({
          [blah.id]: false,
          [foo.id]: false,
        }))
    );

    it('delete by name', () =>
      doBulkDelete([blah.name, foo.name])

      // { status: 'complete' }
        .then((res) => checkJobStatus({
          jobId: res.body.jobId,
          expectedStatus: jobStatus.complete,
        }))

        // "Blah" and "Foo" were deleted
        .then(() => checkSubjectsExist({
          [blah.id]: false,
          [foo.id]: false,
        }))
    );

    it('delete by id and name', () =>
      doBulkDelete([blah.id, foo.name])

      // { status: 'complete' }
        .then((res) => checkJobStatus({
          jobId: res.body.jobId,
          expectedStatus: jobStatus.complete,
        }))

        // "Blah" and "Foo" were deleted
        .then(() => checkSubjectsExist({
          [blah.id]: false,
          [foo.id]: false,
        }))
    );

    it('delete nonexistent subject', () =>
      doBulkDelete(['aaa'])

      // { status: 'complete', errors: [ ... ] }
        .then((res) => checkJobStatus({
          jobId: res.body.jobId,
          expectedStatus: jobStatus.complete,
          expectedErrors: ['ResourceNotFoundError'],
        }))

        // subject does not exist
        .then(() => checkSubjectsExist({
          aaa: false,
        }))
    );

    it('no write permission', () =>
      doBulkDelete([blah.id, restricted.id])

      // { status: 'complete', errors: [ ... ] }
        .then((res) => checkJobStatus({
          jobId: res.body.jobId,
          expectedStatus: jobStatus.complete,
          expectedErrors: ['ForbiddenError'],
        }))

        // blah deleted, restricted still exists
        .then(() => checkSubjectsExist({
          [blah.id]: false,
          [restricted.id]: true,
        }))
    );

    it('delete parent with child', () =>
      doBulkDelete([parent.id, child.id])

      // { status: 'complete', errors: [ ... ] }
        .then((res) => checkJobStatus({
          jobId: res.body.jobId,
          expectedStatus: jobStatus.complete,
          expectedErrors: ['SubjectDeleteConstraintError'],
        }))

        // child deleted, parent still exists
        .then(() => checkSubjectsExist({
          [parent.id]: true,
          [child.id]: false,
        }))
    );

    it('multiple errors', () =>
      doBulkDelete([blah.id, foo.id, 'aaa', parent.id, child.id, restricted.id])

      // { status: 'complete', errors: [ ... ] }
        .then((res) => checkJobStatus({
          jobId: res.body.jobId,
          expectedStatus: jobStatus.complete,
          expectedErrors: [
            'ResourceNotFoundError',
            'SubjectDeleteConstraintError',
            'ForbiddenError',
          ],
        }))

        // blah, foo, and child deleted. restricted and parent still exist
        .then(() => checkSubjectsExist({
          [blah.id]: false,
          [foo.id]: false,
          aaa: false,
          [parent.id]: true,
          [child.id]: false,
          [restricted.id]: true,
        }))
    );

    it('test logging', (done) => {
      testUtils.toggleOverride('enableApiActivityLogs', true);
      testUtils.toggleOverride('enableWorkerActivityLogs', true);
      const RADIX = 10;

      api.post(DELETE_PATH)
        .set('Authorization', token)
        .send([blah.id, foo.id, 'aaa'])
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            return done(err);
          }

          // don't call done() yet, need to wait for data to be logged
        });

      queueTestUtils.testWorkerAPiActivityLogs(done);
    });

    it('failed job', () => {
      simulateFailure = true;
      return doBulkDelete([blah.id, foo.id])

      // { status: failed, error: 'Shutdown' }
        .then((res) => checkJobStatus({
          jobId: res.body.jobId,
          expectedStatus: jobStatus.failed,
          expectedError: 'Job Failed',
        }))

        // not deleted
        .then(() => checkSubjectsExist({
          [blah.id]: true,
          [foo.id]: true,
        }));
    });
  });
}

describe('tests/api/v1/subjects/bulkDelete.js  >', () => {
  const toggleName = 'enableBullForBulkDelSubj';
  const toggle2Name = 'anyBullEnabled';
  describe('enableBullForBulkDelSubj toggle OFF >', () => {
    const jobStatus = {
      complete: 'complete',
      failed: 'failed',
    };
    const initialFeatureState = featureToggles
      .isFeatureEnabled(toggleName);
    const initialFeature2State = featureToggles
      .isFeatureEnabled(toggle2Name);
    before(() => {
      testUtils.toggleOverride(toggleName, false);
      testUtils.toggleOverride(toggle2Name, false);
    });
    after(() => {
      testUtils.toggleOverride(toggleName,
      initialFeatureState);
      testUtils.toggleOverride(toggle2Name,
      initialFeature2State);
    });
    testBulkDeleteSubjects(jobStatus);
  });

  describe('enableBullForBulkDelSubj toggle ON >', () => {
    const jobStatus = {
      complete: 'completed',
      failed: 'failed',
    };
    const initialFeatureState = featureToggles
      .isFeatureEnabled(toggleName);
    const initialFeature2State = featureToggles
      .isFeatureEnabled(toggle2Name);
    before(() => {
      testUtils.toggleOverride(toggleName, true);
      testUtils.toggleOverride(toggle2Name, true);
    });
    after(() => {
      testUtils.toggleOverride(toggleName,
      initialFeatureState);
      testUtils.toggleOverride(toggle2Name,
      initialFeature2State);
    });
    testBulkDeleteSubjects(jobStatus);
  });
});
