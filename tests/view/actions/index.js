/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/actions/index.js
 */
import { expect } from 'chai';
import { getActionAndKeyFromUrl } from '../../../view/admin/actions/index';
import * as types from '../../../view/admin/constants';

describe('tests/view/actions/index.js, actions >', () => {
  function checkResult(expectedAction, result) {
    expect(result.actionName).to.equal(expectedAction.actionName);
    expect(result.key).to.equal(expectedAction.key);
  }

  it('should create a FETCH resources action', () => {
    const verb = 'FETCH';
    const expectedAction = {
      actionName: types.FETCH_ASPECTS,
      key: 'aspects',
    };
    const result = getActionAndKeyFromUrl(verb, '/aspects');
    checkResult(expectedAction, result);
  });

  it('extra slash at the end should still create a FETCH resources action', () => {
    const verb = 'FETCH';
    const expectedAction = {
      actionName: types.FETCH_ASPECTS,
      key: 'aspects',
    };
    const result = getActionAndKeyFromUrl(verb, '/aspects/');
    checkResult(expectedAction, result);
  });

  it('should create a FETCH resource action', () => {
    const verb = 'FETCH';
    const expectedAction = {
      actionName: types.FETCH_ASPECT,
      key: 'aspect',
    };
    const result = getActionAndKeyFromUrl(verb, '/aspects/keyName');
    checkResult(expectedAction, result);
  });

  it('should create a POST action', () => {
    const verb = 'POST';
    const expectedAction = {
      actionName: types.POST_ASPECT,
      key: 'aspect',
    };
    const result = getActionAndKeyFromUrl(verb, '/aspects/keyName');
    checkResult(expectedAction, result);
  });

  it('should create a PATCH action', () => {
    const verb = 'PATCH';
    const expectedAction = {
      actionName: types.PATCH_ASPECT,
      key: 'aspect',
    };
    const result = getActionAndKeyFromUrl(verb, '/aspects/keyName');
    checkResult(expectedAction, result);
  });
});
