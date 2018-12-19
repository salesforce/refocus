/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/events/postBulk.js
 */
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const u = require('./utils');
const tu = require('../../../testUtils');
const expect = require('chai').expect;

const path = '/v1/events/bulk';
const ZERO = 0;
const ONE = 1;
const TWO = 2;

describe('tests/api/v1/events/postBulk.js >', () => {
  let token;

  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteToken);

  it('Pass, POST an array of events', (done) => {
    const event1 = u.getStandard();
    const event2 = u.getStandard();
    event1.log = 'This is event 1';
    event2.log = 'This is event 2';
    const eventsArray = [event1, event2];

    api.post(`${path}`)
    .set('Authorization', token)
    .send(eventsArray)
    .expect(constants.httpStatus.OK)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.status).to.equal('OK');
      done();
    });
  });

  it('Fail, first Event did not contain log', (done) => {
    const event1 = u.getStandard();
    const event2 = u.getStandard();
    delete event1.log;
    const eventsArray = [event1, event2];

    api.post(`${path}`)
    .set('Authorization', token)
    .send(eventsArray)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors.length).to.equal(ONE);
      expect(res.body.errors[ZERO].source).to.equal('0');
      expect(res.body.errors[ZERO].message).to
        .equal('Missing required property: log');
      done();
    });
  });

  it('Fail, both Events were invalid', (done) => {
    const event1 = u.getStandard();
    const event2 = u.getStandard();
    delete event1.log;
    event2.context = 'This should be an object!';
    const eventsArray = [event1, event2];

    api.post(`${path}`)
    .set('Authorization', token)
    .send(eventsArray)
    .expect(constants.httpStatus.BAD_REQUEST)
    .end((err, res) => {
      if (err) {
        return done(err);
      }

      expect(res.body.errors.length).to.equal(TWO);
      done();
    });
  });
});
