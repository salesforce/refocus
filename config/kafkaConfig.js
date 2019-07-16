/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

const herokuConfig = {
  topic: process.env.KAFKA_LOGGING_TOPIC ? process.env.KAFKA_LOGGING_TOPIC : 'refocus-whitelist',
  sslCert: process.env.KAFKA_CLIENT_CERT || '.ssl/client.crt',
  sslKey: process.env.KAFKA_CLIENT_CERT_KEY || '.ssl/client.key',
  connectionString: process.env.KAFKA_URL ? process.env.KAFKA_URL.replace(/\+ssl/g, '') : '',
};

const testConfig = {
  topic: 'test-topic',
  sslCert: 'test-cert',
  sslKey: 'test-key',
  connectionString: 'test-url',
};

const kafkaConfig = {
  test: testConfig,
  integration: herokuConfig,
  production: herokuConfig,
  staging: herokuConfig,
};

module.exports = {
  getConfig: (environmentName) => {
    if (!environmentName) environmentName = process.env.NODE_ENV;
    return kafkaConfig[environmentName] ? kafkaConfig[environmentName] : kafkaConfig.test;
  },

  kafkaLogging: process.env.KAFKA_LOGGING ? true : false,

  // Local logging will only be off if process.env.LOCAL_LOGGING is false, default true
  localLogging: process.env.LOCAL_LOGGING ? !(process.env.LOCAL_LOGGING === 'false') : true,
  testExport: {
    herokuConfig,
    testConfig,
  },
};
