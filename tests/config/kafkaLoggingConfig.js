/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

const { getConfig, testExport } = require('../../config/kafkaLoggingConfig');
const { herokuConfig, testConfig } = testExport;
const expect = require('chai').expect;

describe('test/unit/kafkaConfig.js getConfig', () => {
  it('takes environment name if not passed and returns the respective kafkaConfig', () => {
    const resultConfig = getConfig();
    expect(resultConfig).to.equal(testConfig);
  });

  it('Overrides env variables if given and returns the respective kafkaConfig', () => {
    expect(getConfig('development')).to.equal(testConfig);
    expect(getConfig('production')).to.equal(herokuConfig);
    expect(getConfig('integration')).to.equal(herokuConfig);
    expect(getConfig('staging')).to.equal(herokuConfig);
  });
});
