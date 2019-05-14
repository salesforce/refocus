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
const expect = require('chai').expect;
const constants = require('../../api/v1/constants');
const tu = require('../testUtils');
const path = '/v1/users';

describe('tests/disableHttp/disableHttp.js, http is disabled >', () => {
  let api;

  before(() => {
    tu.toggleOverride('requireHttps', true);
    api = supertest(require('../../express').app)
  });
  after(() => tu.toggleOverride('requireHttps', false));

  it('GET is rejected', (done) => {
    api.get(path)
    .expect(constants.httpStatus.FORBIDDEN)
    .expect((res) => expect(res).to.have.property('text', 'HTTPS is required.'))
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
    .expect((res) => expect(res).to.have.property('text', 'HTTPS is required.'))
    .end((err /* , res */) => {
      if (err) {
        return done(err);
      }

      done();
    });
  });
});
