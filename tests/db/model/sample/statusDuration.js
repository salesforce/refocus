/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/sample/statusDuration.js
 */
'use strict';
const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const should = chai.should(); // eslint says this isn't used but it *is*!
const expect = chai.expect;
const constants = require('../../../../db/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;
const Op = require('sequelize').Op;

describe.skip('tests/db/model/sample/statusDuration.js >', () => {
  let globalAspect;
  let sample;
  const milliSecond = 1000;
  const aspectToCreate = {
    isPublished: true,
    name: `${tu.namePrefix}Aspect`,
    timeout: '60s',
    valueType: 'NUMERIC',
  };

  const subjectToCreate = {
    isPublished: true,
    name: `${tu.namePrefix}Subject`,
  };

  let aId;
  let sId;

  beforeEach((done) => {
    Aspect.create(aspectToCreate)
    .then((asp) => {
      aId = asp.id;
      globalAspect = asp;
      return Subject.create(subjectToCreate);
    })
    .then((subj) => {
      sId = subj.id;
      return Sample.create({
        aspectId: aId,
        subjectId: sId,
      });
    })
    .then((samp) => {
      sample = samp;
      done();
    })
    .catch(done);
  });

  afterEach(u.forceDelete);

  /**
   * Sets up status ranges on the globalAspect, saves the aspect, and
   * retrieves the sample.
   *
   * @param {Object} ranges - The ranges to set
   * @returns {Promise} which resolves once the aspect record has been saved
   *  and the sample record has been retrieved.
   */
  function setupRanges(ranges) {
    globalAspect.set(ranges);
    return globalAspect.save()
    .then(() => Sample.findOne({
      where: {
        name: {
          [Op.iLike]: sample.name,
        },
      },
    }))
    .then((found) => {
      sample = found;
    });
  } // setupRanges

  describe('status duration calculation >', () => {
    beforeEach((done) => {
      setupRanges({
        criticalRange: [0, 1],
        warningRange: [2, 3],
        infoRange: [4, 4],
        okRange: [5, 10],
      })
      .then(() => done())
      .catch(done);
    });

    it('on create', (done) => {
      expect(sample.previousStatus).to.equal(constants.statuses.Invalid);
      done();
    });

    it('all status transition in previousStatus', (done) => {
      sample.update({ value: '0.25' })
      .should.eventually.have.property('previousStatus',
        constants.statuses.Invalid)
      .then(() => sample.update({ value: '2' })
        .should.eventually.have.property('previousStatus',
        constants.statuses.Critical))
      .then(() => sample.update({ value: '4' })
        .should.eventually.have.property('previousStatus',
        constants.statuses.Warning))
      .then(() => sample.update({ value: '5' })
        .should.eventually.have.property('previousStatus',
        constants.statuses.Info))
      .then(() => sample.update({ value: '0' })
        .should.eventually.have.property('previousStatus',
        constants.statuses.OK))
      .then(() => done())
      .catch(done);
    });

    it('previousStatus should not change when status does ' +
    'not change', (done) => {
      let prevStatus;
      sample.update({ value: '0.25' })
      .then((samp) => {
        prevStatus = samp.dataValues.previousStatus;
        sample.update({ value: '0.50' })
         .should.eventually.have.property('previousStatus', prevStatus);
      })
      .then(() => sample.update({ value: '0.50' })
        .should.eventually.have.property('previousStatus', prevStatus))
      .then(() => sample.update({ value: '0.75' })
        .should.eventually.have.property('previousStatus', prevStatus))
      .then(() => done())
      .catch(done);
    });

    it('statusChangeAt change during transition of status', (done) => {
      sample.update({ value: '0.25' })
      .then((samp) => {
        expect(samp).to.have.property('previousStatus',
            constants.statuses.Invalid);
        expect(samp.statusChangedAt.getTime() - samp.updatedAt.getTime())
            .to.be.below(milliSecond * 2);
      })
      .then(() => done())
      .catch(done);
    });

    it('statusChangeAt should not change when status' +
        ' does not change', (done) => {
      let statusChangeAt;
      sample.update({ value: '0.25' })
      .then((samp) => {
        statusChangeAt = samp.statusChangedAt.getTime();
        return sample.update({ value: '0.50' });
      })
      .then((samp) => {
        expect(samp.statusChangedAt.getTime()).to.equal(statusChangeAt);
        return sample.update({ value: '0.75' });
      })
      .then((samp) => {
        expect(samp.statusChangedAt.getTime()).to.equal(statusChangeAt);
      })
      .then(() => done())
      .catch(done);
    });

    it.skip('previousStatus change with Aspect Range changes', (done) => {
      sample.update({ value: '.25' })
      .then((samp) => {
        expect(samp.status).to.equal(constants.statuses.Critical);
        expect(samp.previousStatus).to.equal(constants.statuses.Invalid);
      })
      .then(() => setupRanges({ criticalRange: [1, 2] }))
      .then(() => {
        expect(sample.status).to.equal(constants.statuses.Invalid);
        expect(sample.previousStatus).to.equal(constants.statuses.Critical);
      })
      .then(() => done())
      .catch(done);
    });
  }); // sample afterCreate hook
});
