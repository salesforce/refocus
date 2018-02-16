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
const path = '/v1/samples/upsert/bulk';
const jobWrapper = require('../../jobQueue/jobWrapper');
const jobQueue = require('../../jobQueue/jobWrapper').jobQueue;
const sinon = require('sinon');
const RADIX = 10;

describe('tests/logging/jobWrapperLogFuncs.js, jobWrapper functions >', () => {
  let token;

  before((done) => {
    tu.toggleOverride('enableWorkerProcess', true);
    tu.toggleOverride('enableWorkerActivityLogs', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);
  after(() => {
    tu.toggleOverride('enableWorkerProcess', false);
    tu.toggleOverride('enableWorkerActivityLogs', false);
  });

  it('mapJobResultsToLogObject function ok', (done) => {
    const currTime = Date.now();
    const jobResultObj = {
      reqStartTime: currTime - 30,
      jobEndTime: currTime - 5,
      queueTime: 10,
      workTime: 15,
      dbTime: 14,
      recordCount: 4,
      errorCount: 2,
    };
    const logObject = {};

    jobWrapper.mapJobResultsToLogObject(jobResultObj, logObject);
    expect(logObject.totalTime).to.be.oneOf(['30ms', '31ms']);
    expect(logObject.queueResponseTime).to.be.oneOf(['5ms', '6ms']);
    expect(logObject.queueTime).to.be.equal(`${jobResultObj.queueTime}ms`);
    expect(logObject.workTime).to.be.equal(`${jobResultObj.workTime}ms`);
    expect(logObject.dbTime).to.be.equal(`${jobResultObj.dbTime}ms`);
    expect(logObject.recordCount).to.be.equal(jobResultObj.recordCount);
    expect(logObject.errorCount).to.be.equal(jobResultObj.errorCount);

    const queueTime = parseInt(logObject.queueTime, RADIX);
    const workTime = parseInt(logObject.workTime, RADIX);
    const queueResponseTime = parseInt(logObject.queueResponseTime, RADIX);
    const totalTime = parseInt(logObject.totalTime, RADIX);
    expect(queueTime + workTime + queueResponseTime).to.equal(totalTime);
    done();
  });

  it('logJobOnComplete function ok', (done) => {
    sinon.spy(jobWrapper, 'logJobOnComplete');
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
    jobWrapper.logJobOnComplete(reqObject, job);
    expect(jobWrapper.processJobOnComplete).to.have.been.called;
    jobWrapper.logJobOnComplete.restore();
    done();
  });
});
