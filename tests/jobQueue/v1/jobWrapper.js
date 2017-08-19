/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/jobQueue/v1/jobWrapper.js
 */
'use strict'; // eslint-disable-line strict

const jobQueue = require('../../../jobQueue/jobWrapper').jobQueue;
const jobWrapper = require('../../../jobQueue/jobWrapper');
const expect = require('chai').expect;
const tu = require('../../testUtils');
const u = require('./utils');
const path = '/v1/samples/upsert/bulk';

describe(`tests/jobQueue/v1/jobWrapper.js, api: POST ${path} >`, () => {
  before(() => {
    tu.toggleOverride('enableWorkerProcess', true);
  });
  after(u.forceDelete);
  after(tu.forceDeleteUser);
  after(() => {
    tu.toggleOverride('enableWorkerProcess', false);
  });

  it('jobQueue should let you create any type of job', (done) => {
    const jobType = 'myTestJob';
    const testData = { foo: 'bar' };
    const job = jobQueue.createJob(jobType, testData);
    expect(job).to.not.equal(null);
    expect(job.type).to.equal(jobType);
    expect(job.data).to.equal(testData);
    done();
  });

  it('jobWrapper: function "createJob" should create ' +
    'job synchronously', (done) => {
    const jobType = 'myTestJob';
    const testData = { foo: 'bar' };
    const job = jobWrapper.createJob(jobType, testData);
    expect(job).to.not.equal(null);
    expect(job.type).to.equal(jobType);
    expect(job.data).to.equal(testData);
    done();
  });

  it('jobWrapper: promisified job creation should return job with a ' +
    'job id', (done) => {
    const jobType = 'myTestJob';
    const testData = { foo: 'bar' };
    jobWrapper.createPromisifiedJob(jobType, testData)
    .then((job) => {
      expect(job).to.not.equal(null);
      expect(job.type).to.equal(jobType);
      expect(job.data).to.equal(testData);
      expect(job.id).to.be.at.least(1);
      done();
    })
    .catch((err) => done(err));
  });
});

