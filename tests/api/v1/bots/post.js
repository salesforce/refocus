/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/bots/post.js
 */

'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Bot = tu.db.Bot;
const path = '/v1/bots';
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;
const TWO = 2;

describe(`api: POST ${path}`, () => {

  afterEach(u.forceDelete);

  describe('POST bot', () => {
    it('Pass, post bot', (done) => {
      api.post(`${path}`)
      .send(u.getStandard())
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.name).to.equal(u.name);
        done();
      });
    });

    it('Fail, duplicate bot', (done) => {
      u.createStandard()
      .then(() => done())

      api.post(`${path}`)
      .send(u.getStandard())
      .expect(constants.httpStatus.FORBIDDEN)
      .end((err, res) => {
        if (err) {
          done(err);
        }
        expect(res.body.errors[0].type).to
        .contain('SequelizeUniqueConstraintError');
      });
    });

    it('Fail, bot validation incorrect', (done) => {
      let testBot = u.getStandard();
      testBot.actions = 'INVALID_VALUE';

      api.post(`${path}`)
      .send(testBot)
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          done(err);
        }
        expect(res.body.errors[0].type).to
        .contain('SCHEMA_VALIDATION_FAILED');
        done();
      });
    });

  });

});
