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
'use strict';
const jobQueue = require('../../../jobQueue/jobWrapper').jobQueue;
const expect = require('chai').expect;
const tu = require('../../testUtils');
const u = require('./utils');
const path = '/v1/samples/upsert/bulk';

describe('api: POST ' + path, () => {
  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('jobWrapper should let you create any job type of job', (done) => {
    const jobType = 'myTestJob';
    const testData = { foo: 'bar' };
    const job = jobQueue.createJob(jobType, testData);
    expect(job).to.not.equal(null);
    expect(job.type).to.equal(jobType);
    expect(job.data).to.equal(testData);
    done();
  });
});

