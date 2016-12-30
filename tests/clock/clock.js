/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/clock/clock.js
 */
describe('initiate clock process', () => {
  it('initiates without error', (done) => {
    try {
      require('../../clock');
      done();
    } catch (err) {
      done(err);
    }
  });
});
