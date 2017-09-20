/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/bots/put.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const path = '/v1/bots';
const expect = require('chai').expect;
const ZERO = 0;
const fs = require('fs');
const paths = require('path');
const tu = require('../../../testUtils');
const uiBlob2 = fs.readFileSync(paths.join(__dirname, './uiBlob2'));

describe('tests/api/v1/bots/put.js >', () => {
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

  it('Pass, put bot UI', (done) => {
    api.put(`${path}/${testBot.id}`)
    .set('Authorization', token)
    .field('name', u.name)
    .attach('ui', 'tests/api/v1/bots/uiBlob2')
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.ui.name).to.equal('uiBlob2');
      tu.db.Bot.scope('botUI').findAll()
      .then((o) => {
        expect(o[ZERO].ui.length).to.equal(uiBlob2.length);
        done();
      })
      .catch(done);
    });
  });

  it('Fail, put bot invalid name', (done) => {
    const newName = '~!invalidName';
    api.put(`${path}/${testBot.id}`)
    .set('Authorization', token)
    .send({ name: newName })
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors[ZERO].type)
      .to.contain('Error');
      done();
    });
  });

  it('Fail, put bot invalid attribute', (done) => {
    api.put(`${path}/${testBot.id}`)
    .set('Authorization', token)
    .send({ invalid: true })
    .expect(constants.httpStatus.CREATED)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body).not.to.have.property('invalid');
      done();
    });
  });
});
