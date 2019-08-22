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
const tracker = require('../../kafkaTracking');
const sinon = require('sinon');

describe('tests/kafkaTracking/kafkaTracking.js >', () => {
  it('sendUpdateReceivedTracking calls logger.log with write arguments', () => {
    const updatedAt = new Date().toISOString();
    const loggerStub = sinon.stub(logger, 'track');
    const now = Date.now();
    tracker.sendUpdateReceivedTracking('testSample', updatedAt, now);

    const firstCall = loggerStub.getCall(0).args;
    expect(firstCall[0].type).to.equal(tracker.MESSAGE_TYPES.RECEIVED);
    expect(firstCall[0].reqStartTime).to.equal(now);
    expect(firstCall[0].jobStartTime).to.equal(now);
    expect(firstCall[1]).to.equal('info');
    expect(firstCall[2]).to.equal(tracker.AGGR_TOPIC);
    expect(firstCall[3].sampleName).to.equal('testSample');
    expect(firstCall[3].updatedAt).to.equal(updatedAt);

    const now2 = Date.now();
    tracker.sendUpdateReceivedTracking('testSample', updatedAt, now, now2);
    const secondCall = loggerStub.getCall(1).args;
    expect(secondCall[0].reqStartTime).to.equal(now);
    expect(secondCall[0].jobStartTime).to.equal(now2);
    loggerStub.restore();
  });

  it('sendPublishTracking calls logger.log with write arguments', () => {
    const updatedAt = new Date().toISOString();
    const loggerStub = sinon.stub(logger, 'track');
    tracker.sendPublishTracking('testSample', updatedAt);
    const args = loggerStub.getCall(0).args;
    expect(args[0].publishCompletedAt).to.be.an('number');
    expect(args[0].type).to.equal(tracker.MESSAGE_TYPES.PUBLISH_TIME);
    expect(args[1]).to.equal('info');
    expect(args[2]).to.equal(tracker.AGGR_TOPIC);
    expect(args[3].sampleName).to.equal('testSample');
    expect(args[3].updatedAt).to.equal(updatedAt);
    loggerStub.restore();
  });

  it('sendUpdateReceivedTracking throws error for invalid args', () => {
    const errorSpy = sinon.spy(logger, 'error');
    tracker.sendUpdateReceivedTracking('foo', new Date().toISOString(), null);
    tracker.sendUpdateReceivedTracking(null,
        new Date().toISOString(), Date.now());
    tracker.sendUpdateReceivedTracking('foo', null, Date.now());
    expect(errorSpy.calledThrice).to.equal(true);
    errorSpy.restore();
  });

  it('sendPublishTracking throws error for invalid args', () => {
    const errorSpy = sinon.spy(logger, 'error');
    tracker.sendPublishTracking('foo');
    tracker.sendPublishTracking(null, new Date().toISOString());
    expect(errorSpy.calledTwice).to.equal(true);
    errorSpy.restore();
  });
});

