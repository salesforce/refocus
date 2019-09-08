/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/helpers/aspectUtils.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
require('chai').use(require('chai-as-promised')).should();
const tu = require('../../testUtils');
const u = require('../model/aspect/utils');
const aspectUtils = require('../../../db/helpers/aspectUtils');
const Aspect = tu.db.Aspect;

describe('tests/db/model/aspect/aspectUtils.js >', () => {
  afterEach(u.forceDelete);

  describe('validateAspectStatusRanges >', () => {
    describe('individual ranges', () => {
      describe('numeric', () => {
        it('ok', () =>
          validateNumericRanges({
            criticalRange: [-1234, 1234],
          })
          .should.eventually.be.fulfilled
        );

        it('below min', () =>
          validateNumericRanges({
            okRange: [Number.MIN_SAFE_INTEGER - 5, 1234],
          })
          .should.eventually.be.rejectedWith(
            'Value type: NUMERIC can only have ranges with min value:' +
            ' -9007199254740991, max value: 9007199254740991',
          )
        );

        it('above max', () =>
          validateNumericRanges({
            criticalRange: [-1234, Number.MAX_SAFE_INTEGER + 10],
          })
          .should.eventually.be.rejectedWith(
            'Value type: NUMERIC can only have ranges with min value:' +
            ' -9007199254740991, max value: 9007199254740991',
          )
        );
      });

      describe('boolean', () => {
        it('ok', () =>
          validateBooleanRanges({
            okRange: [1, 1],
          })
          .should.eventually.be.fulfilled
        );

        it('non-boolean', () =>
          validateBooleanRanges({
            okRange: [1, 0],
          })
          .should.eventually.be.rejectedWith(
            'Value type: BOOLEAN can only have ranges: [0,0] or [1,1]',
          )
        );
      });

      describe('percent', () => {
        it('ok', () =>
          validatePercentRanges({
            okRange: [25, 50],
          })
          .should.eventually.be.fulfilled
        );

        it('less than 0', () =>
          validatePercentRanges({
            okRange: [-1, 1],
          })
          .should.eventually.be.rejectedWith(
            'Value type: PERCENT can only have ranges with min value:' +
            ' 0, max value: 100',
          )
        );

        it('greater than 100', () =>
          validatePercentRanges({
            okRange: [0, 110],
          })
          .should.eventually.be.rejectedWith(
            'Value type: PERCENT can only have ranges with min value:' +
            ' 0, max value: 100',
          )
        );
      });
    });

    describe('multiple ranges', () => {
      describe('boolean', () => {
        it('ok', () =>
          validateBooleanRanges({
            criticalRange: [0, 0],
            okRange: [1, 1],
          })
          .should.eventually.be.fulfilled
        );

        it('duplicate', () =>
          validateBooleanRanges({
            criticalRange: [0, 0],
            okRange: [0, 0],
          })
          .should.eventually.be.rejectedWith(
            'Same value range to multiple statuses is not allowed for value type: BOOLEAN'
          )
        );

        it('too many ranges', () =>
          validateBooleanRanges({
            criticalRange: [0, 0],
            warningRange: [1, 1],
            okRange: [1, 1],
          })
          .should.eventually.be.rejectedWith(
            'More than 2 status ranges cannot be assigned for value type: BOOLEAN'
          )
        );
      });

      describe('percent', () => {
        it('ok', () =>
          validatePercentRanges({
            criticalRange: [0, 20],
            warningRange: [21, 40],
            infoRange: [41, 50],
            okRange: [51, 100],
          })
          .should.eventually.be.fulfilled
        );
      });

      describe('numeric', () => {
        it('basic ranges', () =>
          validateNumericRanges({
            criticalRange: [0, 1],
            warningRange: [2, 3],
            infoRange: [4, 4],
            okRange: [5, 10],
          })
          .should.eventually.be.fulfilled
        );

        it('negative int ranges with null range in the middle', () =>
          validateNumericRanges({
            criticalRange: [-10, -1],
            warningRange: null,
            infoRange: [0, 0],
            okRange: [1, 10],
          })
          .should.eventually.be.fulfilled
        );

        it('all null ranges', () =>
          validateNumericRanges({
            criticalRange: null,
            warningRange: null,
            infoRange: null,
            okRange: null,
          })
          .should.eventually.be.fulfilled
        );

        it('non-contiguous ranges', () =>
          validateNumericRanges({
            criticalRange: [0, 10],
            warningRange: null,
            infoRange: [20, 30],
            okRange: null,
          })
          .should.eventually.be.fulfilled
        );

        it('out of order ranges', () =>
          validateNumericRanges({
            criticalRange: [10, 20],
            warningRange: [0, 9],
            infoRange: [21, 30],
            okRange: [-9, -1],
          })
          .should.eventually.be.fulfilled
        );

        it('touching edges', () =>
          validateNumericRanges({
            criticalRange: [0, 5],
            warningRange: [5, 10],
            infoRange: [10, 15],
            okRange: null,
          })
          .should.eventually.be.fulfilled
        );

        it('touching edges, reverse', () =>
          validateNumericRanges({
            criticalRange: [10, 15],
            warningRange: [5, 10],
            infoRange: [0, 5],
            okRange: null,
          })
          .should.eventually.be.fulfilled
        );

        it('singular range', () =>
          validateNumericRanges({
            criticalRange: [0, 3],
            warningRange: [5, 5],
            infoRange: [7, 10],
            okRange: null,
          })
          .should.eventually.be.fulfilled
        );

        it('singular range, reverse', () =>
          validateNumericRanges({
            criticalRange: [7, 10],
            warningRange: [5, 5],
            infoRange: [0, 3],
            okRange: null,
          })
          .should.eventually.be.fulfilled
        );

        it('touching edges, singular ranges', () =>
          validateNumericRanges({
            criticalRange: [10, 10],
            warningRange: [5, 10],
            infoRange: [5, 5],
            okRange: [0, 5],
          })
          .should.eventually.be.fulfilled
        );

        it('identical edge ranges', () =>
          validateNumericRanges({
            criticalRange: [5, 10],
            warningRange: [5, 5],
            infoRange: [5, 5],
            okRange: [1, 5],
          })
          .should.eventually.be.fulfilled
        );

        it('identical non-singular ranges', () =>
          validateNumericRanges({
            criticalRange: [0, 4],
            warningRange: [5, 9],
            infoRange: [5, 9],
            okRange: [10, 14],
          })
          .should.eventually.be.rejectedWith('Ranges cannot overlap')
        );

        it('identical non-edge singular ranges', () =>
          validateNumericRanges({
            criticalRange: [0, 4],
            warningRange: [5, 5],
            infoRange: [5, 5],
            okRange: [6, 10],
          })
          .should.eventually.be.fulfilled
        );

        it('overlapping ranges', () =>
          validateNumericRanges({
            criticalRange: [0, 8],
            warningRange: [10, 15],
            infoRange: [5, 12],
            okRange: null,
          })
          .should.eventually.be.rejectedWith('Ranges cannot overlap')
        );

        it('encompassing ranges', () =>
          validateNumericRanges({
            criticalRange: [2, 3],
            warningRange: [5, 6],
            infoRange: [0, 10],
            okRange: null,
          })
          .should.eventually.be.rejectedWith('Ranges cannot overlap')
        );

        it('infinite ranges', () =>
          validateNumericRanges({
            criticalRange: [Number.MIN_SAFE_INTEGER, -1],
            warningRange: [0, 0],
            infoRange: [1, Number.MAX_SAFE_INTEGER],
            okRange: null,
          })
            .should.eventually.be.fulfilled
        );

        it('decimals', () =>
          validateNumericRanges({
            criticalRange: [0, 2.5],
            warningRange: [2.5, 3.1],
            infoRange: [3.2, 5],
            okRange: null,
          })
          .should.eventually.be.fulfilled
        );
      });
    });
  });

  function validateNumericRanges(ranges) {
    return validateRanges('NUMERIC', ranges);
  }

  function validateBooleanRanges(ranges) {
    return validateRanges('BOOLEAN', ranges);
  }

  function validatePercentRanges(ranges) {
    return validateRanges('PERCENT', ranges);
  }

  function validateRanges(valueType, ranges) {
    const aspInst = Aspect.build({
      name: u.name,
      timeout: '1s',
      isPublished: true,
      valueType,
      ...ranges,
    });

    return Promise.resolve().then(() =>
      aspectUtils.validateAspectStatusRanges(aspInst)
    );
  }
});
