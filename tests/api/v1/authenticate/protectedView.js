/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/authenticate/protectedView.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const perspectivesPath = '/perspectives';

describe('tests/api/v1/authenticate/protectedView.js >', () => {
  it('lens path redirects to login', (done) => {
    api.get(perspectivesPath)
    .expect((res) => expect(res.redirect).to.be.true)
    .expect((res) => {
      expect(res.header.location).to.contain('/login');
    })
    .end(done);
  });
});
