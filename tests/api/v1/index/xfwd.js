/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/index/xfwd.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const expect = require('chai').expect;

describe('tests/api/v1/index/xfwd.js >', () => {
  describe('default allow multiple x-forwarded-for ip addresses >', () => {
    it('ok', (done) => {
      api.get('/')
      .set('x-forwarded-for', '1.2.3.4,5.6.7.8')
      .expect(constants.httpStatus.FOUND)
      .end(done);
    });
  });
});
