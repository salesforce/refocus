/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/timeout.js
 */
'use strict'; // eslint-disable-line strict
const tu = require('../../../testUtils');
const rtu = require('../redisTestUtil');
const samstoinit = require('../../../../cache/sampleStoreInit');
const doTimeout = require('../../../../cache/sampleStoreTimeout').doTimeout;
const rcli = require('../../../../cache/redisCache').client.sampleStore;
const expect = require('chai').expect;
const Sample = tu.db.Sample;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;

describe('tests/cache/models/samples/timeout.js, api::cache::timeout', () => {
  let updatedAt;
  const defaultForStatus = 'Timeout';
  const twentyFourhours = 24;
  const hundredDays = 100;
  const tenSeconds = 10;
  const fiveMinutes = 5;

  before(() => tu.toggleOverride('enableRedisSampleStore', true));
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
    .then(() => samstoinit.eradicate())
    .then(() => samstoinit.init())
    .then(() => done())
    .catch(done);
  });

  afterEach(rtu.forceDelete);
  after(tu.forceDeleteUser);
  after(() => tu.toggleOverride('enableRedisSampleStore', false));

  it('createdAt and updatedAt fields have the expected format', (done) => {
    const mockUpdatedAt = updatedAt;
    mockUpdatedAt.setHours(updatedAt.getHours() +
      (twentyFourhours * hundredDays));
    doTimeout(mockUpdatedAt)
    .then((res) => {
      const { timedOutSamples } = res;
      for (let i = timedOutSamples.length - 1; i >= 0; i--) {
        const { updatedAt, statusChangedAt } = timedOutSamples[i];
        expect(updatedAt).to.equal(new Date(updatedAt).toISOString());
        expect(statusChangedAt)
        .to.equal(new Date(statusChangedAt).toISOString());
      }

      done();
    })
    .catch(done);
  });

  it('simulate 100 days in the future', (done) => {
    const mockUpdatedAt = updatedAt;
    mockUpdatedAt.setHours(updatedAt.getHours() +
      (twentyFourhours * hundredDays));
    doTimeout(mockUpdatedAt)
    .then((res) => {
      expect(res).to.contain({ numberEvaluated: 4, numberTimedOut: 4 });
      expect(res.timedOutSamples.length).to.equal(res.numberTimedOut);
    })
    .then(() => rcli.keysAsync(
      `samsto:sample:${tu.namePrefix}Subject|*`.toLowerCase())
    )
    .then((sNames) => {
      const commands = [];
      sNames.forEach((s) => {
        commands.push(['hgetall', s]);
      });
      return rcli.batch(commands).execAsync();
    })
    .then((samples) => {
      samples.forEach((s) => {
        expect(s.status).to.equal(defaultForStatus);
      });
      done();
    })
    .catch(done);
  });

  it('simulate 1 day in the future', (done) => {
    const mockUpdatedAt = updatedAt;
    mockUpdatedAt.setHours(updatedAt.getHours() + twentyFourhours);
    doTimeout(mockUpdatedAt)
    .then((res) => {
      expect(res).to.contain({ numberEvaluated: 4, numberTimedOut: 3 });
      expect(res.timedOutSamples.length).to.equal(res.numberTimedOut);
    })
    .then(() => rcli.keysAsync(
      `samsto:sample:${tu.namePrefix}Subject|*`.toLowerCase())
    )
    .then((sNames) => {
      const commands = [];
      sNames.forEach((s) => {
        commands.push(['hgetall', s]);
      });
      return rcli.batch(commands).execAsync();
    })
    .then((samples) => {
      samples.forEach((s) => {
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
      });
    })
    .then(() => done())
    .catch(done);
  });

  it('simulate 5 minutes in the future', (done) => {
    const mockUpdatedAt = updatedAt;
    mockUpdatedAt.setMinutes(updatedAt.getMinutes() + fiveMinutes);
    doTimeout(mockUpdatedAt)
    .then((res) => {
      expect(res).to.contain({ numberEvaluated: 4, numberTimedOut: 2 });
      expect(res.timedOutSamples.length).to.equal(res.numberTimedOut);
    })
    .then(() => rcli.keysAsync(
      `samsto:sample:${tu.namePrefix}Subject|*`.toLowerCase())
    )
    .then((sNames) => {
      const commands = [];
      sNames.forEach((s) => {
        commands.push(['hgetall', s]);
      });
      return rcli.batch(commands).execAsync();
    })
    .then((samples) => {
      samples.forEach((s) => {
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
      });
    })
    .then(() => done())
    .catch(done);
  });

  it('simulate 10 seconds in the past', (done) => {
    const mockUpdatedAt = updatedAt;
    mockUpdatedAt.setSeconds(updatedAt.getSeconds() - tenSeconds);
    doTimeout(mockUpdatedAt)
    .then((res) => {
      expect(res).to.contain({ numberEvaluated: 4, numberTimedOut: 0 });
      expect(res.timedOutSamples.length).to.equal(res.numberTimedOut);
    })
    .then(() => rcli.keysAsync(
      `samsto:sample:${tu.namePrefix}Subject|*`.toLowerCase()))
    .then((sNames) => {
      const commands = [];
      sNames.forEach((s) => {
        commands.push(['hgetall', s]);
      });
      return rcli.batch(commands).execAsync();
    })
    .then((samples) => {
      samples.forEach((s) => {
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
      });
    })
    .then(() => done())
    .catch(done);
  });
});
