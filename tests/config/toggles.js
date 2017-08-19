/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/config/toggles.js
 */
const expect = require('chai').expect;
const toggles = require('../../config/toggles');

describe('tests/config/toggles.js >', () => {
  it('environmentVariableTrue', (done) => {
    const env = {
      foo: true,
      bar: false,
      baz: null,
      foobar: 'True',
      barbaz: 'falSE',
    };
    expect(toggles.environmentVariableTrue(env, 'foo')).to.equal(true);
    expect(toggles.environmentVariableTrue(env, 'bar')).to.equal(false);
    expect(toggles.environmentVariableTrue(env, 'baz')).to.equal(false);
    expect(toggles.environmentVariableTrue(env, 'foobar')).to.equal(true);
    expect(toggles.environmentVariableTrue(env, 'barbaz')).to.equal(false);
    expect(toggles.environmentVariableTrue(env, '')).to.equal(false);
    expect(toggles.environmentVariableTrue(env)).to.equal(false);
    expect(toggles.environmentVariableTrue(env, 'hello')).to.equal(false);
    done();
  });
});
