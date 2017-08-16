/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/logging/activityLogUtils.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const activityLogUtils = require('../../utils/activityLog');

describe('tests/logging/activityLogUtils.js, /utils/activityLog >', () => {
  it('updateActivityLogParams function ok', (done) => {
    const resultObj = {};
    const tempObj = {
      reqStartTime: 10,
      jobStartTime: 15,
      jobEndTime: 29,
      dbStartTime: 23,
      dbEndTime: 27,
    };
    activityLogUtils.updateActivityLogParams(resultObj, tempObj);
    expect(resultObj.dbTime).to.be.equal(4);
    expect(resultObj.jobEndTime).to.be.equal(29);
    expect(resultObj.workTime).to.be.equal(14);
    expect(resultObj.reqStartTime).to.be.equal(10);
    expect(resultObj.queueTime).to.be.equal(5);
    done();
  });

  it('updateActivityLogParams - missing dbEndTime', (done) => {
    const resultObj = {};
    const tempObj = {
      reqStartTime: 10,
      jobStartTime: 15,
      jobEndTime: 29,
      dbStartTime: 23,
    };
    activityLogUtils.updateActivityLogParams(resultObj, tempObj);
    expect(resultObj.dbTime).to.not.exist;
    expect(resultObj.jobEndTime).to.be.equal(29);
    expect(resultObj.workTime).to.be.equal(14);
    expect(resultObj.reqStartTime).to.be.equal(10);
    expect(resultObj.queueTime).to.be.equal(5);
    done();
  });

  it('updateActivityLogParams - missing dbStartTime', (done) => {
    const resultObj = {};
    const tempObj = {
      reqStartTime: 10,
      jobStartTime: 15,
      jobEndTime: 29,
      dbEndTime: 27,
    };
    activityLogUtils.updateActivityLogParams(resultObj, tempObj);
    expect(resultObj.dbTime).to.not.exist;
    expect(resultObj.jobEndTime).to.be.equal(29);
    expect(resultObj.workTime).to.be.equal(14);
    expect(resultObj.reqStartTime).to.be.equal(10);
    expect(resultObj.queueTime).to.be.equal(5);
    done();
  });

  it('updateActivityLogParams - missing jobEndTime', (done) => {
    const resultObj = {};
    const tempObj = {
      reqStartTime: 10,
      jobStartTime: 15,
      dbStartTime: 23,
      dbEndTime: 27,
    };
    activityLogUtils.updateActivityLogParams(resultObj, tempObj);
    expect(resultObj.dbTime).to.be.equal(4);
    expect(resultObj.jobEndTime).to.not.exist;
    expect(resultObj.workTime).to.not.exist;
    expect(resultObj.reqStartTime).to.be.equal(10);
    expect(resultObj.queueTime).to.be.equal(5);
    done();
  });

  it('updateActivityLogParams - missing jobStartTime', (done) => {
    const resultObj = {};
    const tempObj = {
      reqStartTime: 10,
      jobEndTime: 29,
      dbStartTime: 23,
      dbEndTime: 27,
    };
    activityLogUtils.updateActivityLogParams(resultObj, tempObj);
    expect(resultObj.dbTime).to.be.equal(4);
    expect(resultObj.jobEndTime).to.be.equal(29);
    expect(resultObj.workTime).to.not.exist;
    expect(resultObj.reqStartTime).to.be.equal(10);
    expect(resultObj.queueTime).to.not.exist;
    done();
  });

  it('updateActivityLogParams - missing reqStartTime', (done) => {
    const resultObj = {};
    const tempObj = {
      jobStartTime: 15,
      jobEndTime: 29,
      dbStartTime: 23,
      dbEndTime: 27,
    };
    activityLogUtils.updateActivityLogParams(resultObj, tempObj);
    expect(resultObj.dbTime).to.be.equal(4);
    expect(resultObj.jobEndTime).to.be.equal(29);
    expect(resultObj.workTime).to.be.equal(14);
    expect(resultObj.reqStartTime).to.not.exist;
    expect(resultObj.queueTime).to.not.exist;
    done();
  });
});
