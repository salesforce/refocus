/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/jobQueue/v1/getHierarchy.js
 */
'use strict';
const jobQueue = require('../../../jobQueue/setup').jobQueue;
const jobType = require('../../../jobQueue/setup').jobType;
const getHierarchyJob = require('../../../worker/jobs/getHierarchyJob');
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../index').app);
const tu = require('../../testUtils');
const u = require('./utils');
const constants = require('../../../api/v1/constants');
const Subject = tu.db.Subject;
const path = '/v1/subjects/{key}/hierarchy';
const logger = require('../../../utils/activityLog').logger;
const featureToggles = require('feature-toggles');
const RADIX = 10;
let enableWorkerProcessInitial;
let enqueueHierarchyInitial;

describe('tests/jobQueue/v1/getHierarchy.js, ' +
`api: GET using worker process ${path} >`, () => {
  before(() => {
    enableWorkerProcessInitial = featureToggles.isFeatureEnabled('enableWorkerProcess');
    enqueueHierarchyInitial = featureToggles.isFeatureEnabled('enqueueHierarchy');
    tu.toggleOverride('enableWorkerProcess', true);
    tu.toggleOverride('enqueueHierarchy', true);
    jobQueue.process(jobType.GET_HIERARCHY, getHierarchyJob);
    jobQueue.testMode.enter(true);
    jobQueue.testMode.clear();
  });

  afterEach(() => jobQueue.testMode.clear());
  after(() => jobQueue.testMode.exit());

  //run normal getHierarchy tests with worker enabled
  require('../../api/v1/subjects/getHierarchy');
  require('../../api/v1/subjects/getHierarchyAspectAndTagsFilters');
  require('../../api/v1/subjects/getHierarchyStatusAndCombinedFilters');

  describe(`api: GET using worker process ${path} >`, () => {
    const par = { name: `${tu.namePrefix}NorthAmerica`, isPublished: true };
    const chi = { name: `${tu.namePrefix}Canada`, isPublished: true };
    const grn = { name: `${tu.namePrefix}Quebec`, isPublished: true };
    const aspect = {
      name: 'temperature',
      timeout: '30s',
      isPublished: true,
      rank: 10,
    };
    const sample1 = { value: '10' };
    const invalidKey = '00000';
    const invalidFilterParams = '?status=aaa,-aaa';
    let token;
    let ipar = 0;
    let ichi = 0;
    let igrn = 0;
    let nonWorkerResponse;

    // setup hierarchy
    before((done) => {
      Subject.create(par)
      .then((subj) => {
        ipar = subj.id;
      })
      .then(() => {
        chi.parentId = ipar;
        return Subject.create(chi);
      })
      .then((subj) => {
        ichi = subj.id;
        grn.parentId = ichi;
        return Subject.create(grn);
      })
      .then((sub) => {
        sample1.subjectId = sub.id;
        igrn = sub.id;
        return tu.db.Aspect.create(aspect);
      })
      .then((a) => {
        sample1.aspectId = a.id;
        return tu.db.Sample.create(sample1);
      })
      .then((samp) => {
        sample1.id = samp.id;
        done();
      })
      .catch(done);
    });

    //create token
    before((done) => {
      tu.createToken()
      .then((returnedToken) => {
        token = returnedToken;
        done();
      })
      .catch(done);
    });

    //get non-worker response
    before((done) => {
      tu.toggleOverride('enableWorkerProcess', false);
      tu.toggleOverride('enqueueHierarchy', false);
      api.get(path.replace('{key}', ipar))
      .set('Authorization', token)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        nonWorkerResponse = res.body;
        tu.toggleOverride('enableWorkerProcess', true);
        tu.toggleOverride('enqueueHierarchy', true);
        done();
      });
    });

    after(u.forceDelete);
    after(tu.forceDeleteUser);

    it('examine enqueued data', (done) => {
      api.get(path.replace('{key}', ipar))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err) => {
        if (err) {
          return done(err);
        }

        // make sure the job is enqueued
        expect(jobQueue.testMode.jobs.length).to.equal(1);

        // make sure the job type is correct
        expect(jobQueue.testMode.jobs[0].type).to.equal(jobType.GET_HIERARCHY);

        // make sure the queue has the right data inside it
        expect(jobQueue.testMode.jobs[0].data.params.key.value).to.equal(ipar);

        done();
      });
    });

    it('worker response should be the same as non-worker', (done) => {
      api.get(path.replace('{key}', ipar))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body).to.deep.equal(nonWorkerResponse);
        done();
      });
    });

    it('test logging', (done) => {
      tu.toggleOverride('enableApiActivityLogs', true);
      tu.toggleOverride('enableWorkerActivityLogs', true);
      let workerLogged = false;
      let apiLogged = false;

      api.get(path.replace('{key}', ipar))
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        logger.removeListener('logging', testLogMessage);
        tu.toggleOverride('enableApiActivityLogs', false);
        tu.toggleOverride('enableWorkerActivityLogs', false);

        if (err) {
          return done(err);
        }

        expect(workerLogged).to.be.true;
        expect(apiLogged).to.be.true;
        done();
      });

      logger.on('logging', testLogMessage);
      function testLogMessage(transport, level, msg, meta) {
        const logObj = {};
        msg.split(' ').forEach((entry) => {
          logObj[entry.split('=')[0]] = entry.split('=')[1];
        });

        if (logObj.activity === 'worker') {
          try {
            expect(logObj.totalTime).to.match(/\d+ms/);
            expect(logObj.queueTime).to.match(/\d+ms/);
            expect(logObj.queueResponseTime).to.match(/\d+ms/);
            expect(logObj.workTime).to.match(/\d+ms/);
            expect(logObj.dbTime).to.match(/\d+ms/);
            expect(logObj.recordCount).to.equal('1');
            expect(logObj.errorCount).to.equal('0');

            const totalTime = parseInt(logObj.totalTime, RADIX);
            const queueTime = parseInt(logObj.queueTime, RADIX);
            const queueResponseTime = parseInt(logObj.queueResponseTime, RADIX);
            const workTime = parseInt(logObj.workTime, RADIX);
            const dbTime = parseInt(logObj.dbTime, RADIX);

            expect(workTime).to.be.at.least(dbTime);
            expect(totalTime).to.be.at.least(workTime);
            expect(totalTime).to.be.at.least(queueTime);
            expect(totalTime).to.be.at.least(queueResponseTime);
            expect(queueTime + workTime + queueResponseTime).to.equal(totalTime);

            workerLogged = true;
          } catch (err) {
            done(err);
          }
        }

        if (logObj.activity === 'api') {
          try {
            expect(logObj.totalTime).to.match(/\d+ms/);
            expect(logObj.dbTime).to.match(/\d+ms/);
            expect(logObj.recordCount).to.equal('1');
            expect(logObj.responseBytes).to.match(/\d+/);

            const totalTime = parseInt(logObj.totalTime, RADIX);
            const dbTime = parseInt(logObj.dbTime, RADIX);

            expect(totalTime).to.be.above(dbTime);

            apiLogged = true;
          } catch (err) {
            done(err);
          }
        }
      };
    });

    it('Error handling - Not Found', (done) => {
      api.get(path.replace('{key}', invalidKey))
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors).to.exist;
        expect(res.body.errors[0]).to.exist;
        err = res.body.errors[0];
        expect(err.message)
        .to.equal('An unexpected ResourceNotFoundError occurred.');
        expect(err.source).to.equal('Subject');
        expect(err.value).to.equal(invalidKey);
        expect(err.type).to.equal('ResourceNotFoundError');
        expect(err.description).to.equal('');
        done();
      });
    });

    it('Error handling - Bad Request', (done) => {
      api.get(path.replace('{key}', ipar) + invalidFilterParams)
      .set('Authorization', token)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.errors).to.exist;
        expect(res.body.errors[0]).to.exist;
        err = res.body.errors[0];
        expect(err.message).to.equal('Filter should be passed in query ' +
          'parameter as an include filter or an exclude filter, but not ' +
          'the combination of both.');
        expect(err.source).to.equal('');
        expect(err.value).to.equal('');
        expect(err.type).to.equal('InvalidFilterParameterError');
        expect(err.description).to.equal('');
        done();
      });
    });

  });

  after(() => {
    tu.toggleOverride('enableWorkerProcess', enableWorkerProcessInitial);
    tu.toggleOverride('enqueueHierarchy', enqueueHierarchyInitial);
  });
});
