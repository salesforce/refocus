/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/model/sample/statusCalculation.js
 */
'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
chai.use(chaiAsPromised);
const should = chai.should(); // eslint says this isn't used but it *is*!
const constants = require('../../../../db/constants');
const tu = require('../../../testUtils');
const u = require('./utils');
const Sample = tu.db.Sample;
const Aspect = tu.db.Aspect;
const Subject = tu.db.Subject;

describe('db: sample: statusCalculation: ', () => {
  let globalAspect;
  let sample;
  const defaultForValue = '';

  const aspectToCreate = {
    isPublished: true,
    name: `${tu.namePrefix}Aspect`,
    timeout: '30s',
    valueType: 'NUMERIC',
  };

  const subjectToCreate = {
    isPublished: true,
    name: `${tu.namePrefix}Subject`,
  };

  before((done) => {
    let aId;
    let sId;
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
    .catch((err) => done(err));
  });

  after(u.forceDelete);

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
    .then(() => Sample.findById(sample.id))
    .then((found) => {
      sample = found;
    });
  } // setupRanges

  describe('integer ranges: ', () => {
    describe('basic ranges (AND calculate invoked on update): ', () => {
      before((done) => {
        setupRanges({
          criticalRange: [0, 1],
          warningRange: [2, 3],
          infoRange: [4, 4],
          okRange: [5, 10],
        })
        .then(() => done())
        .catch((err) => done(err));
      });

      it('value = range min', (done) => {
        sample.update({ value: '2' })
        .should.eventually.have.property('value', '2')
        .then(() => Sample.findById(sample.id)
        .should.eventually.have.deep.property('dataValues.status',
          constants.statuses.Warning))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('value = range max', (done) => {
        sample.update({ value: '1' })
        .should.eventually.have.property('value', '1')
        .then(() => Sample.findById(sample.id)
        .should.eventually.have.deep.property('dataValues.status',
          constants.statuses.Critical))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('value = range min and max', (done) => {
        sample.update({ value: '4' })
        .should.eventually.have.property('value', '4')
        .then(() => Sample.findById(sample.id)
        .should.eventually.have.deep.property('dataValues.status',
          constants.statuses.Info))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('value is between range min and max', (done) => {
        sample.update({ value: '8' })
        .should.eventually.have.property('value', '8')
        .then(() => Sample.findById(sample.id)
        .should.eventually.have.deep.property('dataValues.status',
          constants.statuses.OK))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('value is greater than any of the range max values', (done) => {
        sample.update({ value: '11' })
        .should.eventually.have.property('value', '11')
        .then(() => Sample.findById(sample.id)
        .should.eventually.have.deep.property('dataValues.status',
          constants.statuses.Invalid))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('value is less than any of the range min values', (done) => {
        sample.update({ value: '-1' })
        .should.eventually.have.property('value', '-1')
        .then(() => Sample.findById(sample.id)
        .should.eventually.have.deep.property('dataValues.status',
          constants.statuses.Invalid))
        .then(() => done())
        .catch((err) => done(err));
      });
    });

    describe('negative int ranges with null range in the middle: ', () => {
      before((done) => {
        setupRanges({
          criticalRange: [-10, -1],
          warningRange: null,
          infoRange: [0, 0],
          okRange: [1, 10],
        })
        .then(() => done())
        .catch((err) => done(err));
      });

      it('value = range min', (done) => {
        sample.update({ value: '-10' })
        .should.eventually.have.property('value', '-10')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Critical))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('value = range max', (done) => {
        sample.update({ value: '-1' })
        .should.eventually.have.property('value', '-1')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Critical))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('value = range min and max', (done) => {
        sample.update({ value: '0' })
        .should.eventually.have.property('value', '0')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Info))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('value is between range min and max, after a null range', (done) => {
        sample.update({ value: '8' })
          .should.eventually.have.property('value', '8')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.OK))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('value is less than any of the range min values', (done) => {
        sample.update({ value: '-11' })
          .should.eventually.have.property('value', '-11')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Invalid))
        .then(() => done())
        .catch((err) => done(err));
      });
    });

    describe('all null ranges: ', () => {
      before((done) => {
        setupRanges({
          criticalRange: null,
          warningRange: null,
          infoRange: null,
          okRange: null,
        })
        .then(() => done())
        .catch((err) => done(err));
      });

      it('positive integer value should be -1', (done) => {
        sample.update({ value: '4' })
          .should.eventually.have.property('value', '4')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Invalid))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('negative integer value should be -1', (done) => {
        sample.update({ value: '-4' })
          .should.eventually.have.property('value', '-4')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Invalid))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('zero value should be -1', (done) => {
        sample.update({ value: '0' })
          .should.eventually.have.property('value', '0')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Invalid))
        .then(() => done())
        .catch((err) => done(err));
      });
    });

    describe('non-contiguous ranges: ', () => {
      before((done) => {
        setupRanges({
          criticalRange: [0, 10],
          warningRange: null,
          infoRange: [20, 30],
          okRange: null,
        })
        .then(() => done())
        .catch((err) => done(err));
      });

      it('between the cracks', (done) => {
        sample.update({ value: '15' })
          .should.eventually.have.property('value', '15')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Invalid))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('edge of a range', (done) => {
        sample.update({ value: '20' })
          .should.eventually.have.property('value', '20')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Info))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('within a range', (done) => {
        sample.update({ value: '25' })
          .should.eventually.have.property('value', '25')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Info))
        .then(() => done())
        .catch((err) => done(err));
      });
    });

    describe('out of order ranges: ', () => {
      before((done) => {
        setupRanges({
          criticalRange: [10, 20],
          warningRange: [0, 9],
          infoRange: [21, 30],
          okRange: [-9, -1],
        })
        .then(() => done())
        .catch((err) => done(err));
      });

      it('within range 3', (done) => {
        sample.update({ value: '-4' })
          .should.eventually.have.property('value', '-4')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.OK))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('within range 1', (done) => {
        sample.update({ value: '5' })
          .should.eventually.have.property('value', '5')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Warning))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('max edge of range 0', (done) => {
        sample.update({ value: '20' })
          .should.eventually.have.property('value', '20')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Critical))
        .then(() => done())
        .catch((err) => done(err));
      });
    });

    describe('overlapping ranges (lowest has precedence): ', () => {
      before((done) => {
        setupRanges({
          criticalRange: [0, 8],
          warningRange: [5, 12],
          infoRange: null,
          okRange: null,
        })
        .then(() => done())
        .catch((err) => done(err));
      });

      it('within the first range only', (done) => {
        sample.update({ value: '4' })
          .should.eventually.have.property('value', '4')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Critical))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('within the overlap', (done) => {
        sample.update({ value: '6' })
          .should.eventually.have.property('value', '6')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Critical))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('within the second range only', (done) => {
        sample.update({ value: '9' })
          .should.eventually.have.property('value', '9')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Warning))
        .then(() => done())
        .catch((err) => done(err));
      });
    });

    describe('infinite ranges: ', () => {
      before((done) => {
        setupRanges({
          criticalRange: [-Infinity, -1],
          warningRange: [0, 0],
          infoRange: [1, Infinity],
          okRange: null,
        })
        .then(() => done())
        .catch((err) => done(err));
      });

      it('within a non-infinite range', (done) => {
        sample.update({ value: '0' })
          .should.eventually.have.property('value', '0')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Warning))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('within the upper infinite bound', (done) => {
        sample.update({ value: '9999' })
          .should.eventually.have.property('value', '9999')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Info))
        .then(() => done())
        .catch((err) => done(err));
      });

      it('within the lower infinite bound', (done) => {
        sample.update({ value: '-20000' })
          .should.eventually.have.property('value', '-20000')
        .then(() => Sample.findById(sample.id)
          .should.eventually.have.deep.property('dataValues.status',
            constants.statuses.Critical))
        .then(() => done())
        .catch((err) => done(err));
      });
    });
  }); // integer ranges

  describe('booleans, etc.: ', () => {
    before((done) => {
      setupRanges({
        criticalRange: [0, 0],
        warningRange: null,
        infoRange: null,
        okRange: [1, 1],
      })
      .then(() => done())
      .catch((err) => done(err));
    });

    it('lower case true => status OK', (done) => {
      sample.update({ value: 'true' })
        .should.eventually.have.property('value', 'true')
      .then(() => Sample.findById(sample.id)
        .should.eventually.have.deep.property('dataValues.status',
          constants.statuses.OK))
      .then(() => done())
      .catch((err) => done(err));
    });

    it('upper case TRUE => status OK', (done) => {
      sample.update({ value: 'TRUE' })
        .should.eventually.have.property('value', 'TRUE')
      .then(() => Sample.findById(sample.id)
        .should.eventually.have.deep.property('dataValues.status',
          constants.statuses.OK))
      .then(() => done())
      .catch((err) => done(err));
    });

    it('lower case false => status 0', (done) => {
      sample.update({ value: 'false' })
        .should.eventually.have.property('value', 'false')
      .then(() => Sample.findById(sample.id)
        .should.eventually.have.deep.property('dataValues.status',
          constants.statuses.Critical))
      .then(() => done())
      .catch((err) => done(err));
    });

    it('weird mixed case FalSe => status 0', (done) => {
      sample.update({ value: 'FalSe' })
        .should.eventually.have.property('value', 'FalSe')
      .then(() => Sample.findById(sample.id)
        .should.eventually.have.deep.property('dataValues.status',
          constants.statuses.Critical))
      .then(() => done())
      .catch((err) => done(err));
    });

    it('any other text => status -1', (done) => {
      sample.update({ value: 'aaa' })
        .should.eventually.have.property('value', 'aaa')
      .then(() => Sample.findById(sample.id)
        .should.eventually.have.deep.property('dataValues.status',
          constants.statuses.Invalid))
      .then(() => done())
      .catch((err) => done(err));
    });

    it('empty string value => -1 status', (done) => {
      sample.update({ value: '' })
        .should.eventually.have.property('value', defaultForValue)
      .then(() => Sample.findById(sample.id)
        .should.eventually.have.deep.property('dataValues.status',
          constants.statuses.Invalid))
      .then(() => done())
      .catch((err) => done(err));
    });

    it('empty string for value => -1 status', (done) => {
      sample.update({ value: '' })
        .should.eventually.have.property('value', defaultForValue)
      .then(() => Sample.findById(sample.id)
        .should.eventually.have.deep.property('dataValues.status',
          constants.statuses.Invalid))
      .then(() => done())
      .catch((err) => done(err));
    });
  }); // booleans

  it('decimals - no rounding expected', () => {
    return setupRanges({
      criticalRange: [0, 25],
      warningRange: [25, 49],
      infoRange: [50, 99],
      okRange: [100, 100]
    })
    .then(() => {
      return sample.update({ value: '8.0' })
      .should.eventually.have.property('status', constants.statuses.Critical);
    })
    .then(() => {
      return sample.update({ value: '99.99' })
      .should.eventually.have.property( 'status', constants.statuses.Invalid);
    });
  });

  it('percent', () => {
    return setupRanges({
      criticalRange: [0, .25],
      warningRange: [.25, .50],
      infoRange: [.50, .75],
      okRange: [.75, 1]
    })
    .then(() => {
      return sample.update({ value: '0.25' })
      .should.eventually.have.property('status', constants.statuses.Critical);
    })
    .then(() => {
      return sample.update({ value: '0.99' })
      .should.eventually.have.property('status', constants.statuses.OK);
    });
  });

  describe('sample afterCreate hook: ', () => {
    before((done) => {
      setupRanges({
        criticalRange: [0, 1],
        warningRange: [2, 3],
        infoRange: [4, 4],
        okRange: [5, 10],
      })
      .then(() => done())
      .catch((err) => done(err));
    });

    it('calculate invoked on create', (done) => {
      Subject.create({
        isPublished: true,
        name: `${tu.namePrefix}Subject2`,
      })
      .then((s2) => {
        Sample.create({
          aspectId: globalAspect.id,
          subjectId: s2.id,
          value: '3',
        })
        .should.eventually.have.property('status', constants.statuses.Warning);
      })
      .then(() => done())
      .catch((err) => done(err));
    });
  }); // sample afterCreate hook

  describe('aspect udpate hook: ', () => {
    before((done) => {
      setupRanges({
        criticalRange: [0, 5],
        warningRange: [6, 10],
        infoRange: [11, 15],
        okRange: [16, 20],
      })
      .then(() => done())
      .catch((err) => done(err));
    });

    it('calculate invoked on aspect update', (done) => {
      sample.update({ value: '7' })
        .should.eventually.have.property('value', '7')
      .then(() => Sample.findById(sample.id)
        .should.eventually.have.deep.property('dataValues.status',
          constants.statuses.Warning))
      .then(() => setupRanges({ warningRange: [8, 10] }))
      .then(() => Sample.findById(sample.id)
        .should.eventually.have.deep.property('dataValues.status',
          constants.statuses.Invalid))
      .then(() => done())
      .catch((err) => done(err));
    });
  }); // aspect udpate hook
});
