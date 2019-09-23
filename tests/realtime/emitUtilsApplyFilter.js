/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/realtime/emitUtilsApplyFilter.js
 */
'use strict'; // eslint-disable-line strict
const expect = require('chai').expect;
const applyFilter = require('../../realtime/emitUtils').applyFilter;

describe('tests/realtime/emitUtilsApplyFilter.js >', () => {
  it('filter undefined', () => expect(applyFilter()).to.be.true);

  describe('exclude filter >', () => {
    describe('aspect name filter >', () => {
      describe('no aspect name >', () => {
        const f = 'EXCLUDE=';
        it('should be true', () => expect(applyFilter(f, 'Dingo')).to.be.true);
      });

      describe('one aspect name >', () => {
        const f = 'EXCLUDE=Dingo';
        it('aspect name matches the exclude filter', () =>
          expect(applyFilter(f, 'Dingo')).to.be.false);
        it('aspect name does not match the exclude filter', () =>
          expect(applyFilter(f, 'Alpaca')).to.be.true);
      });

      describe('multiple aspect names >', () => {
        const f = 'EXCLUDE=Dingo;Alpaca;Orangutan';
        it('aspect name matches the exclude filter', () =>
          expect(applyFilter(f, 'Alpaca')).to.be.false);
        it('aspect name does not match the exclude filter', () =>
          expect(applyFilter(f, 'Armadillo')).to.be.true);
      });
    });

    describe('tag filter >', () => {
      describe('no tags in the filter >', () => {
        const f = 'EXCLUDE=';
        it('no tags on the object', () =>
          expect(applyFilter(f, [])).to.be.true);
        it('one tag on the object', () =>
          expect(applyFilter(f, ['Dingo'])).to.be.true);
        it('multiple tags on the object', () =>
          expect(applyFilter(f, ['Alpaca', 'Armadillo', 'Dingo'])).to.be.true);
      });

      describe('one tag in the filter >', () => {
        const f = 'EXCLUDE=Dingo';
        describe('no tags on the object >', () => {
          it('always true', () => expect(applyFilter(f, [])).to.be.true);
        });

        describe('one tag on the object >', () => {
          it('the tag is in the exclude filter', () =>
            expect(applyFilter(f, ['Dingo'])).to.be.false);
          it('the tag is not in the exclude filter', () =>
            expect(applyFilter(f, ['Alpaca'])).to.be.true);
        });

        describe('multiple tags on the object >', () => {
          it('the tag is in the exclude filter', () =>
            expect(applyFilter(f, ['Armadillo', 'Dingo', 'Rabbit']))
            .to.be.false);
          it('the tag is not in the exclude filter', () =>
            expect(applyFilter(f, ['Alpaca', 'Armadillo', 'Rabbit']))
            .to.be.true);
        });
      });

      describe('multiple tags in the filter >', () => {
        const f = 'EXCLUDE=Cormorant;Dingo;Elephant';
        describe('no tags on the object >', () => {
          it('always true', () => expect(applyFilter(f, '')).to.be.true);
        });

        describe('one tag on the object >', () => {
          it('the tag is in the exclude filter', () =>
            expect(applyFilter(f, ['Dingo'])).to.be.false);
          it('the tag is not in the exclude filter', () =>
            expect(applyFilter(f, ['Alpaca'])).to.be.true);
        });

        describe('multiple tags on the object >', () => {
          it('none of the object tags is in the exclude filter', () =>
            expect(applyFilter(f, ['Alpaca', 'Armadillo'])).to.be.true);
          it('one of the object tags is in the exclude filter', () =>
            expect(applyFilter(f, ['Alpaca', 'Armadillo', 'Cormorant']))
            .to.be.false);
          it('multiple object tags are in the exclude filter', () =>
            expect(applyFilter(f,
              ['Alpaca', 'Armadillo', 'Cormorant', 'Dingo'])).to.be.false);
        });
      });
    });
  });

  describe('include >', () => {
    describe('aspect name filter >', () => {
      describe('no aspect name >', () => {
        const f = 'INCLUDE=';
        it('should be false', () => expect(applyFilter(f, 'Dingo')).to.be.false);
      });

      describe('one aspect name >', () => {
        const f = 'INCLUDE=Dingo';
        it('aspect name matches the include filter', () =>
          expect(applyFilter(f, 'Dingo')).to.be.true);
        it('aspect name does not match the include filter', () =>
          expect(applyFilter(f, 'Alpaca')).to.be.false);
      });

      describe('multiple aspect names >', () => {
        const f = 'INCLUDE=Dingo;Alpaca;Orangutan';
        it('aspect name matches the include filter', () =>
          expect(applyFilter(f, 'Alpaca')).to.be.true);
        it('aspect name does not match the include filter', () =>
          expect(applyFilter(f, 'Armadillo')).to.be.false);
      });
    });

    describe('tag filter >', () => {
      describe('no tags in the filter >', () => {
        const f = 'INCLUDE=';
        it('no tags on the object', () =>
          expect(applyFilter(f, [])).to.be.false);
        it('one tag on the object', () =>
          expect(applyFilter(f, ['Dingo'])).to.be.false);
        it('multiple tags on the object', () =>
          expect(applyFilter(f, ['Alpaca', 'Armadillo', 'Dingo']))
          .to.be.false);
      });

      describe('one tag in the filter >', () => {
        const f = 'INCLUDE=Dingo';
        describe('no tags on the object >', () => {
          it('always false', () => expect(applyFilter(f, [])).to.be.false);
        });

        describe('one tag on the object >', () => {
          it('the tag is in the include filter', () =>
            expect(applyFilter(f, ['Dingo'])).to.be.true);
          it('the tag is not in the include filter', () =>
            expect(applyFilter(f, ['Alpaca'])).to.be.false);
        });

        describe('multiple tags on the object >', () => {
          it('the tag is in the exclude filter', () =>
            expect(applyFilter(f, ['Armadillo', 'Dingo', 'Rabbit']))
            .to.be.true);
          it('the tag is not in the exclude filter', () =>
            expect(applyFilter(f, ['Alpaca', 'Armadillo', 'Rabbit']))
            .to.be.false);
        });
      });

      describe('multiple tags in the filter >', () => {
        const f = 'INCLUDE=Cormorant;Dingo;Elephant';
        describe('no tags on the object >', () => {
          it('always false', () => expect(applyFilter(f, '')).to.be.false);
        });

        describe('one tag on the object >', () => {
          it('the tag is in the include filter', () =>
            expect(applyFilter(f, ['Dingo'])).to.be.true);
          it('the tag is not in the include filter', () =>
            expect(applyFilter(f, ['Alpaca'])).to.be.false);
        });

        describe('multiple tags on the object >', () => {
          it('none of the object tags is in the include filter', () =>
            expect(applyFilter(f, ['Alpaca', 'Armadillo'])).to.be.false);
          it('one of the object tags is in the include filter', () =>
            expect(applyFilter(f, ['Alpaca', 'Armadillo', 'Cormorant']))
            .to.be.true);
          it('multiple object tags are in the include filter', () =>
            expect(applyFilter(f,
              ['Alpaca', 'Armadillo', 'Cormorant', 'Dingo'])).to.be.true);
        });
      });
    });
  });
});
