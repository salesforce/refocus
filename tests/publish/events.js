/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/publish/events.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const supertest = require('supertest');
const redis = require('redis');
const rconf = require('../../config/redisConfig');
const constants = require('../../api/v1/constants');
const api = supertest(require('../../express').app);
const tu = require('../testUtils');
const u = require('../api/v1/events/utils');
const botEventEvents = require('../../realtime/constants').events.botEvent;
const path = '/v1/events';
const DEFAULT_LOCAL_REDIS_URL = '//127.0.0.1:6379';

describe('tests/publish/events.js >', () => {
  let token;
  let subscriber;
  let subscribeTracker = [];

  before((done) => {
    subscriber = redis.createClient(DEFAULT_LOCAL_REDIS_URL);
    subscriber.subscribe(rconf.botChannelName);
    subscriber.on('message', (channel, msg) => subscribeTracker.push(msg));

    tu.createToken()
      .then((returnedToken) => (token = returnedToken))
      .then(() => done())
      .catch(done);
  });

  afterEach(u.forceDelete);
  afterEach(() => subscribeTracker = []);

  after(tu.forceDeleteToken);

  it('POST, subscriber gets events', (done) => {
    api.post(path)
      .set('Authorization', token)
      .send(u.getStandard())
      .expect(constants.httpStatus.CREATED)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(subscribeTracker).to.have.length(1);
        const evt = JSON.parse(subscribeTracker[0]);
        expect(evt).to.have.property(botEventEvents.add);
        const evtBody = evt[botEventEvents.add];
        expect(evtBody).to.include.keys('new', 'old');
        expect(evtBody.old).to.include.keys('id', 'log', 'actionType',
          'context', 'ownerId', 'updatedAt', 'createdAt', 'roomId', 'botId',
          'botDataId', 'botActionId', 'userId', 'pubOpts');
        expect(evtBody.old).to.include.keys('id', 'log', 'actionType',
          'context', 'ownerId', 'updatedAt', 'createdAt', 'roomId', 'botId',
          'botDataId', 'botActionId', 'userId', 'pubOpts');
        expect(evtBody.new).to.have.property('log', 'Sample Event');
        expect(evtBody.new).to.have.property('actionType', 'EventType');
        done();
      });
  });
});
