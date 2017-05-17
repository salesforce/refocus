/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/jobQueue/v1/bulkUpsert.js
 */
'use strict'; // eslint-disable-line strict

const jobQueue = require('../../../jobQueue/setup').jobQueue;
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../../index').app);
const tu = require('../../testUtils');
const u = require('./utils');
const constants = require('../../../api/v1/constants');
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const path = '/v1/samples/upsert/bulk';

describe('api: POST using worker process ' + path, () => {
  let token;

  before((done) => {
    tu.toggleOverride('enableWorkerProcess', true);
    tu.createToken()
    .then((returnedToken) => {
      token = returnedToken;
      done();
    })
    .catch((err) => done(err));
  });

  before((done) => {
    Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect1`,
      timeout: '30s',
      valueType: 'NUMERIC',
      criticalRange: [0, 1],
    })
    .then(() => Aspect.create({
      isPublished: true,
      name: `${tu.namePrefix}Aspect2`,
      timeout: '10m',
      valueType: 'BOOLEAN',
      okRange: [10, 100],
    }))
    .then(() => Subject.create({
      isPublished: true,
      name: `${tu.namePrefix}Subject`,
    }))
    .then(() => done())
    .catch((err) => done(err));
  });

  after(u.forceDelete);
  after(tu.forceDeleteUser);
  after(() => {
    tu.toggleOverride('enableWorkerProcess', false);
  });

  it('should return ok status with the job id for good ' +
      'or bad samples', (done) => {
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
    .expect((res) => {
      expect(res.body.status).to.contain('OK');
      // make sure that the jobId is returned as a part of the response.
      expect(res.body.jobId).to.be.at.least(1);
    })
    .end((err) => {
      if (err) {
        done(err);
      }

      done();
    });
  });
  describe('force create job to return error', () => {
    before((done) => {
      jobQueue.testMode.enter();
      done();
    });
    after((done) => {
      jobQueue.testMode.exit();
      done();
    });
    it('should return 400: bad request', (done) => {
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
      .expect(constants.httpStatus.BAD_REQUEST)
      .end((err) => err ? done(err) : done());
    });
  });
});

