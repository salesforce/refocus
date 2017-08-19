/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/sample/timeout.js
 */
'use strict';
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;

describe('tests/db/model/sample/timeout.js >', () => {
  let updatedAt;
  const defaultForStatus = 'Timeout';
  const twentyFourhours = 24;
  const hundredDays = 100;
  const tenSeconds = 10;
  const fiveMinutes = 5;

  afterEach(u.forceDelete);

  beforeEach((done) => {
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

  it('simulate 100 days in the future', (done) => {
    const mockUpdatedAt = updatedAt;
    mockUpdatedAt.setHours(updatedAt.getHours() +
      (twentyFourhours * hundredDays));
    Sample.doTimeout(mockUpdatedAt)
    .then((res) => {
      expect(res).to.contain({ numberEvaluated: 4, numberTimedOut: 4 });
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
      expect(s.status).to.equal(defaultForStatus);
    }))
    .then(() => done())
    .catch(done);
  });

  it('simulate 1 day in the future', (done) => {
    const mockUpdatedAt = updatedAt;
    mockUpdatedAt.setHours(updatedAt.getHours() + twentyFourhours);
    Sample.doTimeout(mockUpdatedAt)
    .then((res) => {
      expect(res).to.contain({ numberEvaluated: 4, numberTimedOut: 3 });
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
          expect(s.status).to.equal(defaultForStatus);
          break;
        case `${tu.namePrefix}Subject|${tu.namePrefix}NinetyDays`:
          expect(s.status).to.not.equal(defaultForStatus);
          break;
      }
    }))
    .then(() => done())
    .catch(done);
  });

  it('simulate 5 minutes in the future', (done) => {
    const mockUpdatedAt = updatedAt;
    mockUpdatedAt.setMinutes(updatedAt.getMinutes() + fiveMinutes);
    Sample.doTimeout(mockUpdatedAt)
    .then((res) => {
      expect(res).to.contain({ numberEvaluated: 4, numberTimedOut: 2 });
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

  it('simulate 10 seconds in the past', (done) => {
    const mockUpdatedAt = updatedAt;
    mockUpdatedAt.setSeconds(updatedAt.getSeconds() - tenSeconds);
    Sample.doTimeout(mockUpdatedAt)
    .then((res) => {
      expect(res).to.contain({ numberEvaluated: 4, numberTimedOut: 0 });
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
          expect(s.status).to.not.equal(null);
          break;
        case `${tu.namePrefix}Subject|${tu.namePrefix}TwoMinutes`:
          expect(s.status).to.not.equal(null);
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

  it('checktimeout scope should only return required fields' +
      'from sample model', (done) => {
    Sample.scope('checkTimeout').findOne()
    .then((samp) => {
      expect(samp.id).to.not.equal(undefined);
      expect(samp.value).to.not.equal(undefined);
      expect(samp.updatedAt).to.not.equal(undefined);
      expect(samp.name).to.not.equal(undefined);
      expect(samp.aspectId).to.not.equal(undefined);
      expect(samp.subjectId).to.not.equal(undefined);
      expect(samp.relatedLinks).to.not.equal(undefined);
      expect(samp.aspect.name).to.not.equal(undefined);
      expect(samp.aspect.tags).to.not.equal(undefined);

      /*
       * the following sample fields should not be fetched in the
       * checktimeout query
       */
      expect(samp.previousStatus).to.equal(undefined);
      expect(samp.messageBody).to.equal(undefined);
      expect(samp.messageCode).to.equal(undefined);
      expect(samp.status).to.equal(undefined);
      expect(samp.createdAt).to.equal(undefined);
      expect(samp.deletedAt).to.equal(undefined);
    })
    .then(() => done())
    .catch(done);
  });
});
