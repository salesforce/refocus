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
const tu = require('../../../testUtils');

describe('tests/api/v1/bots/patch.js >', () => {
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

  it('Pass, patch bot version', (done) => {
    const version = '2.0.0';
    api.patch(`${path}/${testBot.id}`)
    .set('Authorization', token)
    .send({ version })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.version).to.equal(version);
      done();
    });
  });

  it('Pass, patch bot name', (done) => {
    const newName = 'newName';
    api.patch(`${path}/${testBot.id}`)
    .set('Authorization', token)
    .send({ name: newName })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.name).to.equal(newName);
      done();
    });
  });

  it('Pass, patch bot displayName', (done) => {
    const newDisplayName = 'Cool New Nickname';
    api.patch(`${path}/${testBot.id}`)
      .set('Authorization', token)
      .send({ displayName: newDisplayName })
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.displayName).to.equal(newDisplayName);
        done();
      });
  });

  it('Fail, patch bot invalid name', (done) => {
    const newName = '~!invalidName';
    api.patch(`${path}/${testBot.id}`)
    .set('Authorization', token)
    .send({ name: newName })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[ZERO].type)
      .to.contain(tu.schemaValidationErrorName);
      done();
    });
  });

  it('Fail, patch bot invalid attribute', (done) => {
    api.patch(`${path}/${testBot.id}`)
    .set('Authorization', token)
    .send({ invalid: true })
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).not.to.have.property('invalid');
      done();
    });
  });
});
