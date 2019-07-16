/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

const KafkaProducer = require('no-kafka');
const configFunctions = require('./config/kafkaConfig');
const kafkaConfig = configFunctions.getConfig();
const winston = require('winston');

let producer;
const initKafkaLoggingProducer = () => {
  if (configFunctions.kafkaLogging) {
    producer = new KafkaProducer.Producer({
      connectionString: kafkaConfig.connectionString,
      ssl: {
        cert: kafkaConfig.sslCert,
        key: kafkaConfig.sslKey,
      },
    });
    return producer.init().catch((err) => {
      throw new Error(`Failed to initialized Kafka producer for logging,
      error: ${err}`);
    });
  }

  return Promise.resolve();
};

const logFunc = {
  info: winston.info,
  warn: winston.warn,
  error: winston.error,
  silly: winston.silly,
  verbose: winston.verbose,
  debug: winston.debug,
};

const writeLocalLog = (logMessage) => {
  logFunc[logMessage.message.key](logMessage.message.value);
};

const writeLog = (value, key = 'info', topic = kafkaConfig.topic,
    localCallback = winston.info) => {
  const messageValue = {
    sendTimeStamp: new Date(),
    value,
  };
  const logMessage = {
    topic,
    partition: 0,
    message: {
      key,
      value: JSON.stringify(messageValue),
    },
  };
  let promise;
  if (configFunctions.kafkaLogging) {
    promise = producer.send(logMessage).catch((err) => {
      localCallback(`Sending the log message to Kafka cluster failed,
      retrying, error: ${err}`);
      producer.send(logMessage); // retry again if failed
    });
  }

  if (configFunctions.localLogging) {
    localCallback('Local logging is turned on');
    writeLocalLog(logMessage);
  }

  return promise ? promise : Promise.resolve();
};

const logger = {
  error: (value) => writeLog(value, 'error'),
  warn: (value) => writeLog(value, 'warn'),
  info: (value) => writeLog(value, 'info'),
  debug: (value) => writeLog(value, 'debug'),
  verbose: (value) => writeLog(value, 'verbose'),
  silly: (value) => writeLog(value, 'silly'),
};

module.exports = {
  initKafkaLoggingProducer,
  writeLog,
  logger,
};
