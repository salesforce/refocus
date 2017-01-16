/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/logging/enableWorkerLog.js
 */
'use strict'; // eslint-disable-line strict

const supertest = require('supertest');
const api = supertest(require('../../index').app);
const tu = require('../testUtils');
const u = require('./utils');
const constants = require('../../api/v1/constants');
const Aspect = tu.db.Aspect;
const path = '/v1/samples/upsert/bulk';

// replicated api bulk upsert basic tests with enableWorkerActivityLogs enabled
// to execute worker activity logging and test that it does not interfere with
// the existing code.
describe('api: POST ' + path, () => {
  let token;

  before((done) => {
    tu.toggleOverride('enableWorkerActivityLogs', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch(done);
  });

  before((done) => {
    Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect1`,
      timeout: '30s',
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
    })
    .then(() => done())
    .catch(done);
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);

  it('all succeed', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '4',
      },
    ])
    .expect(constants.httpStatus.OK)
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('some succeed, some fail returns ok', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}NOT_EXIST|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
        value: '4',
      },
    ])
    .expect(constants.httpStatus.OK)
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });

  it('all fail returns ok', (done) => {
    api.post(path)
    .set('Authorization', token)
    .send([
      {
        name: `${tu.namePrefix}NOT_EXIST|${tu.namePrefix}Aspect1`,
        value: '2',
      }, {
        name: `${tu.namePrefix}Subject|${tu.namePrefix}NOT_EXIST`,
        value: '4',
      },
    ])
    .expect(constants.httpStatus.OK)
    .end((err /* , res */) => {
      if (err) {
        done(err);
      }

      done();
    });
  });
});
