/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/start.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/collectors/start';
const getWritersPath = '/v1/collectors/{key}/writers';
const Collector = tu.db.Collector;
const expect = require('chai').expect;

describe('tests/api/v1/collectors/start.js >', () => {
  let i = 0;
  let token;
  let tokenOfSecondUser;
  let userId;
  let collector1;
  const secondUserName = 'userTwo';
  const defaultCollector = {
    name: u.toCreate.name, version: '0.0.1' };

  before((done) => {
    tu.createUserAndToken()
    .then((_user) => {
      token = _user.token;
      userId = _user.id;
      return tu.createUser(secondUserName);
    })
    .then(() => tu.createTokenFromUserName(secondUserName))
    .then((_token) => {
      tokenOfSecondUser = _token;
      done();
    })
    .catch(done);
  });

  beforeEach((done) => {
    Collector.create(u.toCreate)
    .then((c) => {
      i = c.id;
      collector1 = c;
      return tu.db.User.findById(userId);
    })
    .then((usr) => collector1.addWriter(usr))
    .then(() => done())
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  describe('if the collector is registered and status is STOPPED:', () => {
    it('if the user is among the writers, start the collector ' +
      'and return with the collector token', (done) => {

      // default status is STOPPED.
      api.post(path)
      .set('Authorization', token)
      .send(defaultCollector)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.status).to.equal('Running');
        expect(res.body.token).to.be.an('string');
        done();
      });
    });

    it('reject if the user is NOT among the writers', (done) => {
      api.post(path)
      .set('Authorization', tokenOfSecondUser)
      .send(defaultCollector)
      .expect(constants.httpStatus.FORBIDDEN)
      .expect((res) => {
        expect(res.body.errors[0].description).to.equal('Invalid Token.');
      })
      .end(done);
    });
  });

  it('Reject when the user token is invalid', (done) => {
    api.post(path)
    .set('Authorization', 'iDontExist')
    .send({})
    .expect(constants.httpStatus.FORBIDDEN)
    .expect((res) => {
      expect(res.body.errors[0].description).to.equal('Invalid Token.');
    })
    .end(done);
  });

  // need token id to revoke it
  it('Reject when the user token is revoked');

  it('if the collector is not registered, throw an error.', (done) => {
    Collector.findById(i)
    .then((collector) => collector.update({ registered: false }))
    .then(() => {
      api.post(path)
      .set('Authorization', token)
      .send(defaultCollector)
      .expect(constants.httpStatus.FORBIDDEN)
      .end(done);
    });
  });

  it('if the collector is registered but status is PAUSED, ' +
    'throw an error.', (done) => {
    const _collector = JSON.parse(JSON.stringify(u.toCreate));
    _collector.name = 'PausedCollector';

    /*
     * If change from default status Stopped to Paused, will throw err.
     * Thus create new collector instead.
     */
    _collector.status = 'Paused';
    Collector.create(_collector)
    .then((c) => {
      api.post(path.replace('{key}', c.id))
      .set('Authorization', token)
      .send(_collector)
      .expect(constants.httpStatus.FORBIDDEN)
      .end(done);
    });
  });

  it('if the collector is registered but status is RUNNING, ' +
    'throw an error.', (done) => {
    Collector.findById(i)
    .then((collector) => collector.update({ status: 'Running' }))
    .then(() => {
      api.post(path)
      .set('Authorization', token)
      .send(defaultCollector)
      .expect(constants.httpStatus.FORBIDDEN)
      .end(done);
    });
  });

  describe('If not found', () => {
    const _collector = JSON.parse(JSON.stringify(u.toCreate));
    _collector.name = 'newCollector';

    it('If not found, create a new collector record with isRegistered=true ' +
      ' and status=RUNNING, and return with a collector token', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(_collector)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        expect(res.body.status).to.equal('Running');
        expect(res.body.token).to.be.an('string');
        done();
      });
    });

    it.only('if not found, the created collector has the expected writer', (done) => {
      api.post(path)
      .set('Authorization', token)
      .send(_collector)
      .expect(constants.httpStatus.OK)
      .end((err, res) => {
        if (err) {
          return done(err);
        }

        api.get(getWritersPath.replace('{key}', res.body.id))
        .set('Authorization', token)
        .expect(constants.httpStatus.OK)
        .expect((res) => {
          console.log('result', res.body)
          // expect(res.body).to.have.length(3);
        })
        .end(done);
      });
    });
  });
});

