/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/db/helpers/common.js
 */
'use strict';
const expect = require('chai').expect;
const tu = require('../../testUtils');
const u = require('../model/subject/utils');
const Subject = tu.db.Subject;
const common = require('../../../db/helpers/common');

describe('tests/db/helpers/common.js >', () => {
  after(u.forceDelete);

  describe('checkDuplicatesInStringArray >', () => {
    it('empty input returns false', () => {
      expect(common.checkDuplicatesInStringArray()).to.be.false;
    });

    it('empty array input returns false', () => {
      expect(common.checkDuplicatesInStringArray([])).to.be.false;
    });

    it('all identical elements returns true', () => {
      expect(common.checkDuplicatesInStringArray(['a', 'a', 'a'])).to.be.true;
    });

    it('no duplicates return false', () => {
      expect(common.checkDuplicatesInStringArray(['a', 'b', 'c'])).to.be.false;
    });

    it('multiple duplicates return true', () => {
      const uniqueArray = ['a', 'b', 'c'];
      const dupesArr = [];
      dupesArr.push(...uniqueArray);
      dupesArr.push(...uniqueArray);
      dupesArr.push(...uniqueArray);
      expect(dupesArr.length).to.equal(9);
      expect(common.checkDuplicatesInStringArray(dupesArr)).to.be.true;
    });
  });
});
