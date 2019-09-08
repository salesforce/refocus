/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/cache/models/samples/statusCalculation.js
 */
'use strict'; // eslint-disable-line strict
const chai = require('chai');
chai.use(require('chai-as-promised')).should();
const rtu = require('../redisTestUtil');
const constants = require('../../../../db/constants');
const redisOps = rtu.redisOps;

describe('tests/cache/models/samples/statusCalculation.js, ' +
  'redis: aspect: create >', () => {

  afterEach(rtu.flushRedis);

  function setupRanges(ranges) {
    return redisOps.setRanges({ name: 'asp1', ...ranges });
  } // setupRanges

  function calculateAndExpect(value, expectedStatus) {
    return redisOps.calculateSampleStatus({ name: 'sub1.sub2|asp1', value })
           .should.eventually.equal(expectedStatus);
  }

  describe('numeric >', () => {
    describe('basic ranges (AND calculate invoked on update) >', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: [0, 1],
          warningRange: [2, 3],
          infoRange: [4, 4],
          okRange: [5, 10],
        })
      );

      it('value = range min', () =>
        calculateAndExpect('2', constants.statuses.Warning)
      );

      it('value = range max', () =>
        calculateAndExpect('1', constants.statuses.Critical)
      );

      it('value = range min and max', () =>
        calculateAndExpect('4', constants.statuses.Info)
      );

      it('value is between range min and max', () =>
        calculateAndExpect('8', constants.statuses.OK)
      );

      it('value is greater than any of the range max values', () =>
        calculateAndExpect('11', constants.statuses.Invalid)
      );

      it('value is less than any of the range min values', () =>
        calculateAndExpect('-1', constants.statuses.Invalid)
      );
    });

    describe('negative int ranges with null range in the middle >', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: [-10, -1],
          warningRange: null,
          infoRange: [0, 0],
          okRange: [1, 10],
        })
      );

      it('value = range min', () =>
        calculateAndExpect('-10', constants.statuses.Critical)
      );

      it('value = range max', () =>
        calculateAndExpect('-1', constants.statuses.Critical)
      );

      it('value = range min and max', () =>
        calculateAndExpect('0', constants.statuses.Info)
      );

      it('value is between range min and max, after a null range', () =>
        calculateAndExpect('8', constants.statuses.OK)
      );

      it('value is less than any of the range min values', () =>
        calculateAndExpect('-11', constants.statuses.Invalid)
      );
    });

    describe('all null ranges >', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: null,
          warningRange: null,
          infoRange: null,
          okRange: null,
        })
      );

      it('positive integer value should be -1', () =>
        calculateAndExpect('4', constants.statuses.Invalid)
      );

      it('negative integer value should be -1', () =>
        calculateAndExpect('-4', constants.statuses.Invalid)
      );

      it('zero value should be -1', () =>
        calculateAndExpect('0', constants.statuses.Invalid)
      );
    });

    describe('non-contiguous ranges >', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: [0, 10],
          warningRange: null,
          infoRange: [20, 30],
          okRange: null,
        })
      );

      it('between the cracks', () =>
        calculateAndExpect('15', constants.statuses.Invalid)
      );

      it('edge of a range', () =>
        calculateAndExpect('20', constants.statuses.Info)
      );

      it('within a range', () =>
        calculateAndExpect('25', constants.statuses.Info)
      );
    });

    describe('out of order ranges >', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: [10, 20],
          warningRange: [0, 9],
          infoRange: [21, 30],
          okRange: [-9, -1],
        })
      );

      it('within range 3', () =>
        calculateAndExpect('-4', constants.statuses.OK)
      );

      it('within range 1', () =>
        calculateAndExpect('5', constants.statuses.Warning)
      );

      it('max edge of range 0', () =>
        calculateAndExpect('20', constants.statuses.Critical)
      );
    });

    describe('touching edges (lower value has precedence) >', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: [0, 5],
          warningRange: [5, 10],
          infoRange: [10, 15],
          okRange: null,
        })
      );

      it('within the first range only', () =>
        calculateAndExpect('4', constants.statuses.Critical)
      );

      it('on the edge (critical-warning)', () =>
        calculateAndExpect('5', constants.statuses.Critical)
      );

      it('within the second range only', () =>
        calculateAndExpect('6', constants.statuses.Warning)
      );

      it('within the second range only (decimal)', () =>
        calculateAndExpect('5.1', constants.statuses.Warning)
      );

      it('on the edge (warning-info)', () =>
        calculateAndExpect('10', constants.statuses.Warning)
      );

      it('within the third range only', () =>
        calculateAndExpect('12', constants.statuses.Info)
      );
    });

    describe('touching edges reverse order (lower value has precedence) >', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: [10, 15],
          warningRange: [5, 10],
          infoRange: [0, 5],
          okRange: null,
        })
      );

      it('within the first range only', () =>
        calculateAndExpect('12', constants.statuses.Critical)
      );

      it('on the edge (critical-warning)', () =>
        calculateAndExpect('10', constants.statuses.Warning)
      );

      it('within the second range only (decimal)', () =>
        calculateAndExpect('5.1', constants.statuses.Warning)
      );

      it('within the second range only', () =>
        calculateAndExpect('6', constants.statuses.Warning)
      );

      it('on the edge (warning-info)', () =>
        calculateAndExpect('5', constants.statuses.Info)
      );

      it('within the first range only', () =>
        calculateAndExpect('4', constants.statuses.Info)
      );
    });

    describe('singular range >', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: [0, 3],
          warningRange: [5, 5],
          infoRange: [7, 10],
          okRange: null,
        })
      );

      it('within the first range only', () =>
        calculateAndExpect('2', constants.statuses.Critical)
      );

      it('between the cracks (Critical-Warning)', () =>
        calculateAndExpect('4', constants.statuses.Invalid)
      );

      it('within the singular range', () =>
        calculateAndExpect('5', constants.statuses.Warning)
      );

      it('between the cracks (Warning-Info)', () =>
        calculateAndExpect('6', constants.statuses.Invalid)
      );

      it('within the third range only', () =>
        calculateAndExpect('8', constants.statuses.Info)
      );
    });

    describe('singular range reverse order >', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: [7, 10],
          warningRange: [5, 5],
          infoRange: [0, 3],
          okRange: null,
        })
      );

      it('within the third range only', () =>
        calculateAndExpect('2', constants.statuses.Info)
      );

      it('between the cracks (Info-Warning)', () =>
        calculateAndExpect('4', constants.statuses.Invalid)
      );

      it('within the singular range', () =>
        calculateAndExpect('5', constants.statuses.Warning)
      );

      it('between the cracks (Warning-Critical)', () =>
        calculateAndExpect('6', constants.statuses.Invalid)
      );

      it('within the first range only', () =>
        calculateAndExpect('8', constants.statuses.Critical)
      );
    });

    describe('touching edges, singular ranges (lower value has precedence) >', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: [10, 10],
          warningRange: [5, 10],
          infoRange: [5, 5],
          okRange: [0, 5],
        })
      );

      it('within the first range only', () =>
        calculateAndExpect('4', constants.statuses.OK)
      );

      it('on the edge (three ranges)', () =>
        calculateAndExpect('5', constants.statuses.OK)
      );

      it('within the second range only', () =>
        calculateAndExpect('8', constants.statuses.Warning)
      );

      it('on the edge (two ranges)', () =>
        calculateAndExpect('10', constants.statuses.Warning)
      );
    });

    describe('touching edges, singular ranges, reverse (lower value has precedence) >', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: [0, 5],
          warningRange: [5, 5],
          infoRange: [5, 10],
          okRange: [10, 10],
        })
      );

      it('within the first range only', () =>
        calculateAndExpect('4', constants.statuses.Critical)
      );

      it('on the edge (three ranges)', () =>
        calculateAndExpect('5', constants.statuses.Critical)
      );

      it('within the second range only', () =>
        calculateAndExpect('8', constants.statuses.Info)
      );

      it('on the edge (two ranges)', () =>
        calculateAndExpect('10', constants.statuses.Info)
      );
    });

    describe('identical edge ranges', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: [5, 10],
          warningRange: [5, 5],
          infoRange: [5, 5],
          okRange: [1, 5],
        })
      );

      it('within the first range only', () =>
        calculateAndExpect('4', constants.statuses.OK)
      );

      it('on the edge (four ranges)', () =>
        calculateAndExpect('5', constants.statuses.OK)
      );

      it('within the fourth range only', () =>
        calculateAndExpect('8', constants.statuses.Critical)
      );
    });

    describe('identical edge ranges, reverse', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: [1, 5],
          warningRange: [5, 5],
          infoRange: [5, 5],
          okRange: [5, 10],
        })
      );

      it('within the first range only', () =>
        calculateAndExpect('4', constants.statuses.Critical)
      );

      it('on the edge (four ranges)', () =>
        calculateAndExpect('5', constants.statuses.Critical)
      );

      it('within the fourth range only', () =>
        calculateAndExpect('8', constants.statuses.OK)
      );
    });

    describe('identical non-edge singular ranges', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: [0, 4],
          warningRange: [5, 5],
          infoRange: [5, 5],
          okRange: [6, 10],
        })
      );

      it('within the first range only', () =>
        calculateAndExpect('4', constants.statuses.Critical)
      );

      it('singular ranges', () =>
        calculateAndExpect('5', constants.statuses.Info)
      );

      it('within the fourth range only', () =>
        calculateAndExpect('8', constants.statuses.OK)
      );
    });

    describe('identical non-edge singular ranges, reverse', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: [6, 10],
          warningRange: [5, 5],
          infoRange: [5, 5],
          okRange: [0, 4],
        })
      );

      it('within the first range only', () =>
        calculateAndExpect('4', constants.statuses.OK)
      );

      it('singular ranges', () =>
        calculateAndExpect('5', constants.statuses.Info)
      );

      it('within the fourth range only', () =>
        calculateAndExpect('8', constants.statuses.Critical)
      );
    });

    describe('infinite ranges >', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: [Number.MIN_SAFE_INTEGER, -1],
          warningRange: [0, 0],
          infoRange: [1, Number.MAX_SAFE_INTEGER],
          okRange: null,
        })
      );

      it('within a non-infinite range', () =>
        calculateAndExpect('0', constants.statuses.Warning)
      );

      it('within the upper infinite bound', () =>
        calculateAndExpect('9999', constants.statuses.Info)
      );

      it('within the lower infinite bound', () =>
        calculateAndExpect('-20000', constants.statuses.Critical)
      );
    });

    describe('decimal ranges >', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: [0, 2.5],
          warningRange: [2.5, 3.1],
          infoRange: [3.2, 5],
          okRange: null,
        })
      );

      it('within first range (integer)', () =>
        calculateAndExpect('1', constants.statuses.Critical)
      );

      it('within first range (decimal)', () =>
        calculateAndExpect('2.4', constants.statuses.Critical)
      );

      it('on the edge', () =>
        calculateAndExpect('2.50', constants.statuses.Critical)
      );

      it('within second range (decimal)', () =>
        calculateAndExpect('2.51', constants.statuses.Warning)
      );

      it('between the cracks', () =>
        calculateAndExpect('3.15', constants.statuses.Invalid)
      );
    });

    describe('integer ranges, decimal values - no rounding expected >', () => {
      beforeEach(() =>
        setupRanges({
          criticalRange: [0, 25],
          warningRange: [25, 49],
          infoRange: [50, 99],
          okRange: [100, 100],
        })
      );

      it('within first range', () =>
        calculateAndExpect('8.0', constants.statuses.Critical)
      );

      it('within second range', () =>
        calculateAndExpect('25.11', constants.statuses.Warning)
      );

      it('between the cracks', () =>
        calculateAndExpect('99.99', constants.statuses.Invalid)
      );
    });
  }); // numeric

  describe('booleans, etc. >', () => {
    beforeEach(() =>
      setupRanges({
        criticalRange: [0, 0],
        warningRange: null,
        infoRange: null,
        okRange: [1, 1],
      })
    );

    it('lower case true => status OK', () =>
      calculateAndExpect('true', constants.statuses.OK)
    );

    it('upper case TRUE => status OK', () =>
      calculateAndExpect('TRUE', constants.statuses.OK)
    );

    it('lower case false => status 0', () =>
      calculateAndExpect('false', constants.statuses.Critical)
    );

    it('weird mixed case FalSe => status 0', () =>
      calculateAndExpect('FalSe', constants.statuses.Critical)
    );

    it('any other text => status -1', () =>
      calculateAndExpect('aaa', constants.statuses.Invalid)
    );

    it('empty string value => -1 status', () =>
      calculateAndExpect('', constants.statuses.Invalid)
    );
  }); // booleans

  describe('percent', () => {
    it('percent', () =>
      setupRanges({
        criticalRange: [0, 25],
        warningRange: [25, 50],
        infoRange: [50, 75],
        okRange: [75, 100],
      })
      .then(() => calculateAndExpect('25', constants.statuses.Critical))
      .then(() => calculateAndExpect('99', constants.statuses.OK))
    );
  }); // percent
});
