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

describe('tests/logging/apiLogFuncs.js, apiLogUtil: functions >', () => {
  let token;
  const TEN = 10;
  const currTime = Date.now();
  const ZERO = 0;
  const DUMMY_ARRAY = 'qwerty'.split('');
  const jobResultObj = {
    reqStartTime: currTime - TEN,
    dbTime: 16,
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

  it('mapApiResultsToLogObject sets recordCount to custom record Count', () => {
    const logObject = {};
    apiLogUtil.mapApiResultsToLogObject(jobResultObj, logObject, DUMMY_ARRAY, TEN);
    expect(logObject.recordCount).to.equal(TEN);
  });

  it('mapApiResultsToLogObject maps the returned Array recordCount as Array.length', () => {
    const logObject = {};
    apiLogUtil.mapApiResultsToLogObject(jobResultObj, logObject, DUMMY_ARRAY);
    expect(logObject.recordCount).to.equal(DUMMY_ARRAY.length);
  });

  it('mapApiResultsToLogObject maps the returned Object recordCount as 1', () => {
    const logObject = {};
    apiLogUtil.mapApiResultsToLogObject(jobResultObj, logObject, { a: 'string' });
    expect(logObject.recordCount).to.equal(1);
  });

  it('mapApiResultsToLogObject maps the empty returned Object recordCount as 0', () => {
    const logObject = {};
    apiLogUtil.mapApiResultsToLogObject(jobResultObj, logObject, {});
    expect(logObject.recordCount).to.equal(ZERO);
  });

  it('mapApiResultsToLogObject without optional retval param works expected', () => {
    const logObject = {};
    apiLogUtil.mapApiResultsToLogObject(jobResultObj, logObject);
    expect(logObject.totalTime).to.be.a('string');
    expect(logObject.dbTime).to.equal(`${jobResultObj.dbTime}ms`);
    expect(logObject.responseBytes).to.be.undefined;
  });
});
