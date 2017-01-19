/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/logging/jobWrapperLogFuncs.js
 */
'use strict'; // eslint-disable-line strict

const expect = require('chai').expect;
const tu = require('../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;
const path = '/v1/samples/upsert/bulk';
const jobWrapper = require('../../jobQueue/jobWrapper');
const jobQueue = require('../../jobQueue/jobWrapper').jobQueue;
const sinon = require('sinon');

describe('jobWrapper: functions ' + path, () => {
  let token;

  before((done) => {
    tu.toggleOverride('useWorkerProcess', true);
    tu.toggleOverride('enableWorkerActivityLogs', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect1`,
      timeout: '30s',
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);
  after(() => {
    tu.toggleOverride('useWorkerProcess', false);
    tu.toggleOverride('enableWorkerActivityLogs', false);
  });

  it('mapJobResultsToLogObject function ok', (done) => {
    const currTime = Date.now();
    const jobResultObj = {
      reqStartTime: currTime - 10,
      queueTime: 10,
      workTime: 15,
      dbTime: 16,
      recordCount: 4,
      errorCount: 2,
    };
    const logObject = {};

    jobWrapper.mapJobResultsToLogObject(jobResultObj, logObject);
    expect(logObject).to.include.keys('totalTime');
    expect(logObject.queueTime).to.be.equal(`${jobResultObj.queueTime}ms`);
    expect(logObject.workTime).to.be.equal(`${jobResultObj.workTime}ms`);
    expect(logObject.dbTime).to.be.equal(`${jobResultObj.dbTime}ms`);
    expect(logObject.recordCount).to.be.equal(jobResultObj.recordCount);
    expect(logObject.errorCount).to.be.equal(jobResultObj.errorCount);
    done();
  });

  it('logAndRemoveJobOnComplete function ok', (done) => {
    sinon.spy(jobWrapper, 'logAndRemoveJobOnComplete');
    const reqObject = {
      headers: {
        authorization: token,
      },
      connection: {
        remoteAddress: '1.2.3.4',
      },
    };

    const jobType = 'myTestJob';
    const testData = { foo: 'bar' };
    const job = jobQueue.createJob(jobType, testData);

    jobWrapper.logAndRemoveJobOnComplete(reqObject, job);
    expect(jobWrapper.processJobOnComplete).to.have.been.called;
    jobWrapper.logAndRemoveJobOnComplete.restore();
    done();
  });
});
