/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/api/v1/verbs/doPost.js
 */
'use strict';
const expect = require('chai').expect;
const sinon = require('sinon');
const utils = require('../../../../api/v1/helpers/verbs/utils');
const doPost = require('../../../../api/v1/helpers/verbs/doPost');

describe('tests/api/v1/verbs/doPost.js, doPost verb Tests >', () => {
  it('handleError is called', () => {

  });

  it('mergeDuplicateArrayElements', () => {

    //Create a spy for the setName function
    const setNameSpy = sinon.spy(utils, 'mergeDuplicateArrayElements');
    doPost();
    expect(setNameSpy.callCount).to.equal(1);
    setNameSpy.restore();
  });
});