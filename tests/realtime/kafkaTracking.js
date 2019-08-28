/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/kafkaTracking/kafkaTracking.js
 */
/* eslint-disable no-magic-numbers */
const expect = require('chai').expect;
const logger = require('@salesforce/refocus-logging-client');
const tracker = require('../../realtime/kafkaTracking');
const sinon = require('sinon');
const testUtil = require('../testUtils');

describe('tests/kafkaTracking/kafkaTracking.js >', () => {
  before(() => {
    testUtil.toggleOverride('enableKafkaPubSubAggregation', true);
  });

  after(() => {
    testUtil.toggleOverride('enableKafkaPubSubAggregation', false);
  });

  it('trackSampleRequest calls logger.track with right arguments', () => {
    const updatedAt = new Date().toISOString();
    const loggerStub = sinon.stub(logger, 'track');
    const now = Date.now();
    tracker.trackSampleRequest('testSample', updatedAt, now);

    const firstCall = loggerStub.getCall(0).args;
    console.log(firstCall);
    expect(firstCall[0].type).to.equal('requestStarted');
    expect(firstCall[0].reqStartTime).to.equal(now);
    expect(firstCall[0].jobStartTime).to.equal(now);
    expect(firstCall[1]).to.equal('info');
    expect(firstCall[2]).to.equal('pub-sub-aggregation');
    expect(firstCall[3].sampleName).to.equal('testSample');
    expect(firstCall[3].updatedAt).to.equal(updatedAt);

    const now2 = Date.now();
    tracker.trackSampleRequest('testSample', updatedAt, now, now2);
    const secondCall = loggerStub.getCall(1).args;
    expect(secondCall[0].reqStartTime).to.equal(now);
    expect(secondCall[0].jobStartTime).to.equal(now2);
    loggerStub.restore();
  });

  it('trackSamplePublish calls logger.track with write arguments', () => {
    const updatedAt = new Date().toISOString();
    const loggerStub = sinon.stub(logger, 'track');
    tracker.trackSamplePublish('testSample', updatedAt);
    const args = loggerStub.getCall(0).args;
    expect(args[0].publishCompletedAt).to.be.an('number');
    expect(args[0].type).to.equal('published');
    expect(args[1]).to.equal('info');
    expect(args[2]).to.equal('pub-sub-aggregation');
    expect(args[3].sampleName).to.equal('testSample');
    expect(args[3].updatedAt).to.equal(updatedAt);
    loggerStub.restore();
  });

  it('trackSampleRequest throws error for invalid args', () => {
    const errorSpy = sinon.spy(logger, 'error');
    tracker.trackSampleRequest('foo', new Date().toISOString(), null);
    tracker.trackSampleRequest(null,
        new Date().toISOString(), Date.now());
    tracker.trackSampleRequest('foo', null, Date.now());
    expect(errorSpy.calledThrice).to.equal(true);
    errorSpy.restore();
  });

  it('trackSamplePublish throws error for invalid args', () => {
    const errorSpy = sinon.spy(logger, 'error');
    tracker.trackSamplePublish('foo');
    tracker.trackSamplePublish(null, new Date().toISOString());
    expect(errorSpy.calledTwice).to.equal(true);
    errorSpy.restore();
  });
});

