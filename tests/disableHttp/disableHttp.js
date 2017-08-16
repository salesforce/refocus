/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/disableHttp/disableHttp.js
 */
'use strict';

const supertest = require('supertest');
const api = supertest(require('../../index').app);
const constants = require('../../api/v1/constants');
const path = '/v1/users';
const expect = require('chai').expect;

describe('tests/disableHttp/disableHttp.js, http is disabled >', () => {
  it('GET is redirected', (done) => {
    api.get(path)
    .expect(constants.httpStatus.REDIRECT)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });

  it('POST is rejected', (done) => {
    api.post(path)
    .send({ name: 'abc@def.ghi', email: 'abc@def.ghi', password: 'abcdefghi' })
    .expect(constants.httpStatus.FORBIDDEN)
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});
