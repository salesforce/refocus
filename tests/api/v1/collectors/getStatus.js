/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/collectors/getStatus.js
 */
'use strict'; // eslint-disable-line strict
const supertest = require('supertest');
const api = supertest(require('../../../../index').app);
const constants = require('../../../../api/v1/constants');
const collectorStatus = require('../../../../db/constants').collectorStatuses;
const tu = require('../../../testUtils');
const u = require('./utils');
const path = '/v1/collectors/{key}/status';
const expect = require('chai').expect;
const Promise = require('bluebird');
supertest.Test.prototype.endAsync =
  Promise.promisify(supertest.Test.prototype.end);

describe('tests/api/v1/collectors/getStatus.js >', () => {
  let token;
  const collectorObj = u.getCollectorToCreate();
  before((done) => {
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);
  after(tu.forceDeleteUser);

  function expectStatus(key, status) {
    return api.get(path.replace('{key}', key))
    .set('Authorization', token)
    .expect(constants.httpStatus.OK)
    .expect((res) => expect(res.body).to.have.keys('status'))
    .expect((res) => expect(res.body.status).to.equal(status))
    .endAsync();
  }

  it('get status by name', (done) => {
    Promise.resolve()
    .then(() => u.startCollector(collectorObj, {}, token))
    .then(() => expectStatus(collectorObj.name, collectorStatus.Running))
    .then(() => u.pauseCollector(collectorObj, token))
    .then(() => expectStatus(collectorObj.name, collectorStatus.Paused))
    .then(() => u.resumeCollector(collectorObj, token))
    .then(() => expectStatus(collectorObj.name, collectorStatus.Running))
    .then(() => u.stopCollector(collectorObj, token))
    .then(() => expectStatus(collectorObj.name, collectorStatus.Stopped))
    .then(() => done())
    .catch(done);
  });

  it('get status by id', (done) => {
    Promise.resolve()
    .then(() => u.startCollector(collectorObj, {}, token))
    .then(() => expectStatus(collectorObj.id, collectorStatus.Running))
    .then(() => u.pauseCollector(collectorObj, token))
    .then(() => expectStatus(collectorObj.id, collectorStatus.Paused))
    .then(() => u.resumeCollector(collectorObj, token))
    .then(() => expectStatus(collectorObj.id, collectorStatus.Running))
    .then(() => u.stopCollector(collectorObj, token))
    .then(() => expectStatus(collectorObj.id, collectorStatus.Stopped))
    .then(() => done())
    .catch(done);
  });
});
