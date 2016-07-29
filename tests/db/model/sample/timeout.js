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

describe('db: sample: timeout: ', function() {

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
    .catch((err) => done(err));
  });

  it('simulate 100 days in the future', (done) => {
    const mockUpdatedAt = updatedAt;
    mockUpdatedAt.setHours(updatedAt.getHours() + twentyFourhours*hundredDays);
    Sample.doTimeout(mockUpdatedAt)
    .then((msg) => {
      expect(msg).to.equal('Evaluated 4 samples; 4 were timed out.');
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
    .catch((err) => done(err));
  });

  it('simulate 1 day in the future', (done) => {
    const mockUpdatedAt = updatedAt;
    mockUpdatedAt.setHours(updatedAt.getHours() + twentyFourhours);
    Sample.doTimeout(mockUpdatedAt)
    .then((msg) => {
      expect(msg).to.equal('Evaluated 4 samples; 3 were timed out.');
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
    .catch((err) => done(err));
  });

  it('simulate 5 minutes in the future', (done) => {
    const mockUpdatedAt = updatedAt;
    mockUpdatedAt.setMinutes(updatedAt.getMinutes() + fiveMinutes);
    Sample.doTimeout(mockUpdatedAt)
    .then((msg) => {
      expect(msg).to.equal('Evaluated 4 samples; 2 were timed out.');
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
    .catch((err) => done(err));
  });

  it('simulate 10 seconds in the past', (done) => {
    const mockUpdatedAt = updatedAt;
    mockUpdatedAt.setSeconds(updatedAt.getSeconds() - tenSeconds);
    Sample.doTimeout(mockUpdatedAt)
    .then((msg) => {
      expect(msg).to.equal('Evaluated 4 samples; 0 were timed out.');
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
    .catch((err) => done(err));
  });
});
