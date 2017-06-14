/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/bots/delete.js
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

describe(`api: DELETE ${path}`, () => {
  let testBot;

  beforeEach((done) => {
    u.createStandard()
    .then((newBot) => {
      testBot = newBot;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  describe('DELETE bot', () => {
    it('Pass, delete bot', (done) => {
      api.delete(`${path}/${testBot.id}`)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.name).to.equal(u.name);
        done(err);
      });
    });

    it('Fail, bot not found', (done) => {
      api.delete(`${path}/INVALID_ID`)
      .expect(constants.httpStatus.NOT_FOUND)
      .end((err, res) => {
        done(err);
      });
    });
  });

});
