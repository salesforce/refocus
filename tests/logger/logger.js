/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
const expect = require('chai').expect;
const { initKafkaLoggingProducer, writeLog } = require('../../logger');
const KafkaProducer = require('no-kafka');
const sinon = require('sinon');
const tu = require('../testUtils');

describe('test/logger.js > ', () => {
  it('Happy path:call producer with the right args,' +
  'call the init function and send', () => {
    tu.toggleOverride('kafkaLogging', true);
    tu.toggleOverride('localLogging', true);
    const callback = sinon.spy();
    const sendMock = sinon.stub().returns(Promise.resolve());
    const initMock = sinon.stub().returns(Promise.resolve());
    const producerMock = sinon.stub(KafkaProducer, 'Producer').returns({
      init: () => Promise.resolve(initMock()),
      send: (message) => Promise.resolve(sendMock(message)),
    });
    initKafkaLoggingProducer().then(() => {
      sinon.assert.calledWith(producerMock, {
        connectionString: 'test-url',
        ssl: {
          cert: 'test-cert',
          key: 'test-key',
        },
      });
      expect(initMock.calledOnce).to.be.true;
      writeLog('test-value', 'info', 'test-topic', callback).then(() => {
        expect(sendMock.calledOnce).to.be.true;
        expect(callback.calledOnce).to.be.true;
      });
      KafkaProducer.Producer.restore();
    });
  });

  it('Happy path: local logging off', () => {
    tu.toggleOverride('kafkaLogging', true);
    tu.toggleOverride('localLogging', false);
    const callback = sinon.spy();
    const sendMock = sinon.stub().returns(Promise.resolve());
    const initMock = sinon.stub().returns(Promise.resolve());
    const producerMock = sinon.stub(KafkaProducer, 'Producer').returns({
      init: () => Promise.resolve(initMock()),
      send: (message) => Promise.resolve(sendMock(message)),
    });
    initKafkaLoggingProducer().then(() => {
      sinon.assert.calledWith(producerMock, {
        connectionString: 'test-url',
        ssl: {
          cert: 'test-cert',
          key: 'test-key',
        },
      });
      expect(initMock.calledOnce).to.be.true;
      writeLog('test-value', 'info', 'test-topic', callback);
      expect(sendMock.calledOnce).to.be.true;
      expect(callback.calledOnce).to.be.false;
    });
    KafkaProducer.Producer.restore();
  });

  it('Kafka and local both off', () => {
    tu.toggleOverride('kafkaLogging', false);
    tu.toggleOverride('localLogging', false);
    const callback = sinon.spy();
    const sendMock = sinon.stub().returns(Promise.resolve());
    const initMock = sinon.stub().returns(Promise.resolve());
    const producerMock = sinon.stub(KafkaProducer, 'Producer').returns({
      init: () => Promise.resolve(initMock()),
      send: (message) => Promise.resolve(sendMock(message)),
    });
    initKafkaLoggingProducer().then(() => {
      expect(producerMock.calledOnce).to.be.false;
      expect(initMock.calledOnce).to.be.false;
      writeLog('test-value', 'info', 'test-topic', callback);
      expect(sendMock.calledOnce).to.be.false;
      expect(callback.calledOnce).to.be.false;
    });
    KafkaProducer.Producer.restore();
  });

  it('Send throws an error', () => {
    tu.toggleOverride('kafkaLogging', true);
    tu.toggleOverride('localLogging', false);
    const callback = sinon.spy();
    const sendMock = sinon.stub().returns(Promise.reject());
    const initMock = sinon.stub().returns(Promise.resolve());
    const producerMock = sinon.stub(KafkaProducer, 'Producer').returns({
      init: () => Promise.resolve(initMock()),
      send: (message) => Promise.resolve(sendMock(message)),
    });
    initKafkaLoggingProducer().then(() => {
      expect(initMock.calledOnce).to.be.true;
      writeLog('test-value', 'info', 'test-topic',
      callback).then(() => {
        expect(sendMock.calledTwice).to.be.true;
      });
    });
    KafkaProducer.Producer.restore();
  });
});
