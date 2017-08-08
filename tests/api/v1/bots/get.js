/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/bots/get.js
 */

'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const path = '/v1/bots';
const expect = require('chai').expect;
const ZERO = 0;
const ONE = 1;
const TWO = 2;
const fs = require('fs');
const paths = require('path');
const tu = require('../../../testUtils');
const uiBlob = fs.readFileSync(paths.join(__dirname, './uiBlob'));

describe(`api: GET ${path}`, () => {
  let testBot;
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    u.createStandard()
    .then((newBot) => {
      testBot = newBot;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteToken);

  describe('GET bot', () => {
    it('Pass, get array of one', (done) => {
      api.get(`${path}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.length).to.equal(ONE);
        expect(res.body[ZERO].ui.data.length).to.equal(uiBlob.length);
        done(err);
      });
    });

    it('Pass, get array of multiple', (done) => {
      u.createNonActive()
      .then(() => {
        api.get(`${path}`)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            done(err);
          }

          expect(res.body.length).to.equal(TWO);
          done();
        });
      })
      .catch(done);
    });

    it('Pass, get active', (done) => {
      api.get(`${path}?active=true`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.length).to.equal(ONE);
        done(err);
      });
    });

    it('Pass, get inactive', (done) => {
      api.get(`${path}?active=false`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.length).to.equal(ZERO);
        done(err);
      });
    });

    it('Pass, get by name', (done) => {
      u.createNonActive()
      .then(() => {
        api.get(`${path}?name=`+u.name)
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .end((err, res) => {
          if (err) {
            done(err);
          }

          expect(res.body.length).to.equal(ONE);
          expect(res.body[ZERO].name).to.equal(u.name);
          done();
        });
      })
      .catch(done);
    });

    it('Pass, get by id', (done) => {
      api.get(`${path}/${testBot.id}`)
      .set('Authorization', token)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          done(err);
        }

        expect(res.body.name).to.equal(u.name);
        done();
      });
    });

    it('Fail, id not found', (done) => {
      api.get(`${path}/INVALID_ID`)
      .set('Authorization', token)
      .expect(constants.httpStatus.NOT_FOUND)
      .end(() => {
        done();
      });
    });
  });
});

