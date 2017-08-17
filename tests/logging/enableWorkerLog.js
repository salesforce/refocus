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
const expect = require('chai').expect;
const supertest = require('supertest');
const api = supertest(require('../../index').app);
const tu = require('../testUtils');
const u = require('./utils');
const constants = require('../../api/v1/constants');
const Aspect = tu.db.Aspect;
const path = '/v1/samples/upsert/bulk';
const jobQueue = require('../../jobQueue/setup').jobQueue;
const Sample = tu.db.Sample;
const Subject = tu.db.Subject;

describe('tests/logging/enableWorkerLog.js >', () => {
  /*
   * replicated api bulk upsert basic tests with enableWorkerActivityLogs
   * enabled to execute worker activity logging and test that it does not
   * interfere with the existing code.
   */
  describe('enableWorkerLog: api: POST >' + path, () => {
    let token;

    before((done) => {
      tu.toggleOverride('enableWorkerProcess', true);
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
    after(() => {
      tu.toggleOverride('enableWorkerProcess', false);
      tu.toggleOverride('enableWorkerActivityLogs', false);
    });

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
      .end(done);
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
      .end(done);
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
      .end(done);
    });
  });

  describe('enableWorkerLog: db: sample: timeout >', () => {
    let updatedAt;
    const defaultForStatus = 'Timeout';
    const fiveMinutes = 5;

    afterEach(u.forceDelete);

    beforeEach((done) => {
      jobQueue.testMode.enter();
      tu.toggleOverride('enableWorkerProcess', true);
      tu.toggleOverride('enableWorkerActivityLogs', true);
      Aspect.create({
        isPublished: true,
        name: `${tu.namePrefix}OneSecond`,
        timeout: '1s',
        valueType: 'NUMERIC',
        criticalRange: [0, 0],
        warningRange: [1, 1],
        infoRange: [2, 2],
        okRange: [3, 3],
      })
      .then(() => Aspect.create({
        isPublished: true,
        name: `${tu.namePrefix}TwoMinutes`,
        timeout: '2m',
        valueType: 'NUMERIC',
        criticalRange: [0, 0],
        warningRange: [1, 1],
        infoRange: [2, 2],
        okRange: [3, 3],
      }))
      .then(() => Aspect.create({
        isPublished: true,
        name: `${tu.namePrefix}ThreeHours`,
        timeout: '3H',
        valueType: 'NUMERIC',
        criticalRange: [0, 0],
        warningRange: [1, 1],
        infoRange: [2, 2],
        okRange: [3, 3],
      }))
      .then(() => Aspect.create({
        isPublished: true,
        name: `${tu.namePrefix}NinetyDays`,
        timeout: '90D',
        valueType: 'NUMERIC',
        criticalRange: [0, 0],
        warningRange: [1, 1],
        infoRange: [2, 2],
        okRange: [3, 3],
      }))
      .then(() => Subject.create({
        isPublished: true,
        name: `${tu.namePrefix}Subject`,
      }))
      .then(() => Sample.bulkUpsertByName([
        { name: `${tu.namePrefix}Subject|${tu.namePrefix}OneSecond`, value: 1 },
        { name: `${tu.namePrefix}Subject|${tu.namePrefix}TwoMinutes`, value: 1 },
        { name: `${tu.namePrefix}Subject|${tu.namePrefix}ThreeHours`, value: 2 },
        { name: `${tu.namePrefix}Subject|${tu.namePrefix}NinetyDays`, value: 3 },
      ]))
      .then(() => Sample.findAll({
        attributes: ['name', 'updatedAt'],
        where: {
          name: {
            $ilike: `${tu.namePrefix}Subject|%`,
          },
        },
      })
      .each((s) => {
        updatedAt = s.updatedAt;
      }))
      .then(() => done())
      .catch(done);
    });

    after(() => {
      tu.toggleOverride('enableWorkerProcess', false);
      tu.toggleOverride('enableWorkerActivityLogs', false);
      jobQueue.testMode.clear();
    });

    it('simulate 5 minutes in the future', (done) => {
      const mockUpdatedAt = updatedAt;
      mockUpdatedAt.setMinutes(updatedAt.getMinutes() + fiveMinutes);
      Sample.doTimeout(mockUpdatedAt)
      .then((res) => {
        expect(res).to.contains({ numberEvaluated: 4, numberTimedOut: 2 });
        expect(res.timedOutSamples.length).to.equal(res.numberTimedOut);
      })
      .then(() => Sample.findAll({
        where: {
          name: {
            $ilike: `${tu.namePrefix}Subject|%`,
          },
        },
      })
      .each((s) => {
        switch (s.name) {
          case `${tu.namePrefix}Subject|${tu.namePrefix}OneSecond`:
            expect(s.status).to.equal(defaultForStatus);
            break;
          case `${tu.namePrefix}Subject|${tu.namePrefix}TwoMinutes`:
            expect(s.status).to.equal(defaultForStatus);
            break;
          case `${tu.namePrefix}Subject|${tu.namePrefix}ThreeHours`:
            expect(s.status).to.not.equal(null);
            break;
          case `${tu.namePrefix}Subject|${tu.namePrefix}NinetyDays`:
            expect(s.status).to.not.equal(null);
            break;
        }
      }))
      .then(() => done())
      .catch(done);
    });
  });
});
