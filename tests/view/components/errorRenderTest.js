/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/components/errorRenderTest.js
 */
'use strict';
import React from 'react';
import TestUtils from 'react-addons-test-utils';
import { expect } from 'chai';
import ReactDOM from 'react-dom';
import ErrorRender from '../../../view/admin/components/common/ErrorRender.js';

describe('tests/view/components/errorRenderTest.js, ErrorRender tests >',
() => {
  it('error message shows up in error div, when calling error render', () => {
    var error = 'Invalid parent Id';
    var errorRendered = TestUtils.renderIntoDocument(
      <ErrorRender error={error}/>
    );
    var errorDiv = TestUtils.findRenderedDOMComponentWithClass(errorRendered, 'error-text');
    expect(errorDiv.textContent).to.contain(error);
  })
})
