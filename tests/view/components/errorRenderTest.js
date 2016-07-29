/**
 * tests/view/components/errorRenderTest.js
 */
'use strict';

import React from 'react';
import TestUtils from 'react-addons-test-utils';
import { expect } from 'chai';
import ReactDOM from 'react-dom';
import ErrorRender from '../../../view/admin/components/common/ErrorRender.js';

describe('ErrorRender tests', () => {

  it('error message shows up in error div, when calling error render', () => {
    var error = 'Invalid parent Id';
    var errorRendered = TestUtils.renderIntoDocument(
      <ErrorRender error={error}/>
    );
    var errorDiv = TestUtils.findRenderedDOMComponentWithClass(errorRendered, 'error-text');
    expect(errorDiv.textContent).to.contain(error);
  })
})
