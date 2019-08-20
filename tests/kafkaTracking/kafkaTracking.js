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
    const loggerStub = sinon.stub(logger, 'log');
    tracker.sendUpdateReceivedTracking('testSample', updatedAt);
    const args = loggerStub.getCall(0).args;
    expect(args[0].type).to.equal(tracker.MESSAGE_TYPES.RECEIVED);
    expect(args[0].updateReceivedAt instanceof Date).to.equal(true);
    expect(args[1]).to.equal('info');
    expect(args[2]).to.equal(tracker.AGGR_TOPIC);
    expect(args[3].sampleName).to.equal('testSample');
    expect(args[3].updatedAt).to.equal(updatedAt);
    loggerStub.restore();
  });

  it('sendQueueTracking calls logger.log with write arguments', () => {
    const updatedAt = new Date().toISOString();
    const loggerStub = sinon.stub(logger, 'log');
    const num = 5;
    tracker.sendQueueTracking(num, 'testSample', updatedAt);
    const args = loggerStub.getCall(0).args;
    expect(args[0].jobStartTime instanceof ).to.equal(num);
    expect(args[0].type).to.equal(tracker.MESSAGE_TYPES.QUEUE_TIME);
    expect(args[1]).to.equal('info');
    expect(args[2]).to.equal(tracker.AGGR_TOPIC);
    expect(args[3].sampleName).to.equal('testSample');
    expect(args[3].updatedAt).to.equal(updatedAt);
    loggerStub.restore();
  });

  it('sendPublishTracking calls logger.log with write arguments', () => {
    const updatedAt = new Date().toISOString();
    const loggerStub = sinon.stub(logger, 'log');
    tracker.sendPublishTracking(new Date(), 'testSample', updatedAt);
    const args = loggerStub.getCall(0).args;
    expect(args[0].publishTime).to.be.an('number');
    expect(args[0].type).to.equal(tracker.MESSAGE_TYPES.PUBLISH_TIME);
    expect(args[1]).to.equal('info');
    expect(args[2]).to.equal(tracker.AGGR_TOPIC);
    expect(args[3].sampleName).to.equal('testSample');
    expect(args[3].updatedAt).to.equal(updatedAt);
    loggerStub.restore();
  });

  it('Throws error for invalid args', () => {
    const spy = sinon.spy();
    try {
      tracker.sendUpdateReceivedTracking();
    } catch (e) {
      spy();
    }

    try {
      tracker.sendQueueTracking();
    } catch (e) {
      spy();
    }

    try {
      tracker.sendPublishTracking();
    } catch (e) {
      spy();
    }

    expect(spy.calledThrice).to.equal(true);
  });
});

