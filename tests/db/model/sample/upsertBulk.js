/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/sample/upsertBulk.js
 */
'use strict';
const util = require('util');
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const expect = chai.expect;
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;

describe('tests/db/model/sample/upsertBulk.js >', () => {
  describe('normal >', () => {
    after(u.forceDelete);

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
      .catch(done);
    });

    it('all succeed part 1', (done) => {
      Sample.bulkUpsertByName([
        {
          name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
          value: '1',
        }, {
          name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect2`,
          value: '10',
        },
      ])
      .each((o) => {
        if (util.isError(o)) {
          throw new Error('not expecting error');
        }
      })
      .then(() => done())
      .catch(done);
    });

    /**
     * This test verifyies that I can upsert the same aspect back to back in
     * different transactions.
     */
    it('all succeed part 2', (done) => {
      Sample.bulkUpsertByName([
        {
          name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
          value: '2',
        },
      ])
      .each((o) => {
        // console.log(o.dataValues);
        expect(o.dataValues).to.have.property('value', '2');
        if (util.isError(o)) {
          throw new Error('not expecting error');
        }
      })
      .then(() => done())
      .catch(done);
    });

    it('some succeed, some fail', (done) => {
      Sample.bulkUpsertByName([
        {
          name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
          value: '1',
        }, {
          value: '10',
        },
      ])
      .then((o) => {
        expect(o.length).to.equal(2);
        let errorCount = 0;
        let successObj;
        for (let i = 0; i < o.length; i++) {
          const s = o[i];
          if (util.isError(s.explanation)) {
            errorCount++;
          }

          if (s.dataValues) {
            successObj = s.dataValues;
          }
        }

        expect(successObj).to.not.equal(undefined);
        expect(successObj).to.have.deep.property('value', '1');
        expect(errorCount).to.equal(1);
      })
      .then(() => done())
      .catch(done);
    });

    it('all fail', (done) => {
      Sample.bulkUpsertByName([
        {
          name: `${tu.namePrefix}DOES_NOT_EXIST|${tu.namePrefix}Aspect1`,
          value: '1',
        }, {
          name: `${tu.namePrefix}Subject|${tu.namePrefix}DOES_NOT_EXIST`,
          value: '10',
        },
      ])
      .each((o) => {
        if (!util.isError(o.explanation)) {
          throw new Error('expecting error');
        }
      })
      .then(() => done())
      .catch(done);
    });

    it('bulk upsertwith the same value should update' +
    ' the updatedAt timestamp', (done) => {
      let newSample;
      Sample.bulkUpsertByName([
        {
          name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
          value: '1',
        },
      ])
      .each((o) => {
        newSample = o;
      })
      .then(() => Sample.bulkUpsertByName([
        {
          name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect1`,
          value: '1',
        },
      ]))
      .each((samp) => {
        const newSampleUpdateTime = newSample.dataValues.updatedAt.getTime();
        const updatedSampleUpdateTime = samp.dataValues.updatedAt.getTime();
        expect(updatedSampleUpdateTime).to.be.above(newSampleUpdateTime);
      })
      .then(() => done())
      .catch(done);
    });

    it('case insensitive find by subject and aspect', (done) => {
      Sample.bulkUpsertByName([
        {
          name: `${tu.namePrefix}subject|${tu.namePrefix}aspect1`,
          value: '0',
        }, {
          name: `${tu.namePrefix}subject|${tu.namePrefix}aspect2`,
          value: '11',
        },
      ])
      .each((o) => {
        if (util.isError(o)) {
          throw new Error('not expecting error');
        }
      })
      .then(() => done())
      .catch(done);
    });
  });

  describe('many Aspects with Samples >', () => {
    const manySamples = 20;

    after(u.forceDelete);

    beforeEach((done) => {
      Subject.create({
        isPublished: true,
        name: `${tu.namePrefix}Subject`,
      })
      .then(() => Aspect.create({
        isPublished: true,
        name: `${tu.namePrefix}AspectX`,
        timeout: '10m',
        valueType: 'NUMERIC',
        okRange: [10, 100],
      }))
        .then(() => {
          const aspectsToCreate = [];
          for (let x = 0; x < manySamples; x++) {
            aspectsToCreate.push({
              isPublished: true,
              name: `${tu.namePrefix}Aspect${x}`,
              timeout: '30s',
              valueType: 'NUMERIC',
              criticalRange: [0, 1],
            });
          }

          return Aspect.bulkCreate(aspectsToCreate,
           { individualHooks: true, validate: true });
        })
        .then(() => done())
        .catch(done);
    });

    it('Upsert many Aspects with a lot of samples', (done) => {
      const samplesArray = [];
      for (let x = 0; x < manySamples; x++) {
        samplesArray.push({
          name: `${tu.namePrefix}Subject|${tu.namePrefix}Aspect${x}`,
          value: x,
        });
      }

      Sample.bulkUpsertByName(samplesArray)
      .then((o) => {
        expect(o.length).to.equal(manySamples);
        expect(o[18].dataValues).to.have.property('value', '18');
      })
      .then(() => done())
      .catch(done);
    });
  });
});
