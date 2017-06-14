/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/bots/patch.js
 */

'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const path = '/v1/bots';
const expect = require('chai').expect;
const ZERO = 0;

describe(`api: PATCH ${path}`, () => {
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

  describe('PATCH bot', () => {
    it('Pass, patch bot name', (done) => {
      const newName = 'newName';
      api.patch(`${path}/${testBot.id}`)
      .send({ name: newName })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.name).to.equal(newName);
        done();
      });
    });

    it('Fail, patch bot invalid name', (done) => {
      const newName = '~!invalidName';
      api.patch(`${path}/${testBot.id}`)
      .send({ name: newName })
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.errors[ZERO].type).to
        .contain('SequelizeValidationError');
        done();
      });
    });

    it('Fail, patch bot invalid attribute', (done) => {
      api.patch(`${path}/${testBot.id}`)
      .send({ invalid: true })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body).not.to.have.property('invalid');
        done();
      });
    });
  });
});

