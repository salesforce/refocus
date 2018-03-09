/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cors/corsEnabled.js
 */
'use strict';
const supertest = require('supertest');
const api = supertest(require('../../index').app);
const constants = require('../../api/v1/constants');
const botsPath = '/v1/bots';
const botActionsPath = '/v1/botActions';
const botDataPath = '/v1/botData';
const eventsPath = '/v1/events';
const roomsPath = '/v1/rooms';
const profilesPath = '/v1/profiles';
const tu = require('../testUtils');
const b = require('../api/v1/bots/utils');
const Bot = tu.db.Bot;
const expect = require('chai').expect;

describe('tests/cors/corsEnabled.js, CORS testing for routes', () => {
  let token;
  let testBot;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Bot.create(b.getStandard())
    .then((bot) => {
      testBot = bot;
      done();
    })
    .catch(done);
  });

  after(tu.forceDeleteToken);
  afterEach(b.forceDelete);

  it('Pass, GET BotActions and check for access control', (done) => {
    api.get(`${botActionsPath}?botId=${testBot.id}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.headers['access-control-allow-origin']).to.equal('*');
    })
    .end(done);
  });

  it('Pass, GET botData and check for access control', (done) => {
    api.get(`${botDataPath}?botId=${testBot.id}`)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.headers['access-control-allow-origin']).to.equal('*');
    })
    .end(done);
  });

  it('Pass, GET Events and check for access control', (done) => {
    api.get(eventsPath)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.headers['access-control-allow-origin']).to.equal('*');
    })
    .end(done);
  });

  it('Pass, GET bots and check for access control', (done) => {
    api.get(botsPath)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.headers['access-control-allow-origin']).to.equal('*');
    })
    .end(done);
  });

  it('Pass, GET rooms and check for access control', (done) => {
    api.get(roomsPath)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.headers['access-control-allow-origin']).to.equal('*');
    })
    .end(done);
  });

  it('Fail, GET Profiles and check for access control', (done) => {
    api.get(profilesPath)
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => {
      expect(res.headers['access-control-allow-origin']).to.equal(undefined);
    })
    .end(done);
  });
});
