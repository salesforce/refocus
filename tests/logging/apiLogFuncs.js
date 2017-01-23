/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/logging/apiLogFuncs.js
 */
'use strict'; // eslint-disable-line strict

const expect = require('chai').expect;
const tu = require('../testUtils');
const u = require('./utils');
const Aspect = tu.db.Aspect;
const apiLogUtil = require('../../utils/apiLog');
const activityLogUtil = require('../../utils/activityLog');
const sinon = require('sinon');

describe('apiLogUtil: functions ', () => {
  let token;
  const currTime = Date.now();
  const jobResultObj = {
    reqStartTime: currTime - 10,
    dbTime: 16,
    recordCount: 4,
    retval: { a: 'string'},
  };

  before((done) => {
    tu.toggleOverride('enableApiWorkerLogs', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  after(tu.forceDeleteUser);
  after(() => {
    tu.toggleOverride('enableApiWorkerLogs', false);
  });

  it('mapApiResultsToLogObject maps values as expected', (done) => {
    const logObject = {};

    apiLogUtil.mapApiResultsToLogObject(jobResultObj, logObject);
    expect(logObject.totalTime).to.be.a('string');
    expect(logObject.dbTime).to.equal(`${jobResultObj.dbTime}ms`);
    expect(logObject.recordCount).to.equal(jobResultObj.recordCount);
    expect(logObject.responseBytes).to.be.above(0);
    done();
  });
});
