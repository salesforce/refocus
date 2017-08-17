/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/components/controlledInputTest.js
 */

import { expect } from 'chai';
import React from 'react';
import ReactDOM from 'react-dom';
import thunk from 'redux-thunk';
import TestUtils from 'react-addons-test-utils';
import ControlledInput from '../../../view/admin/components/common/ControlledInput';

describe('tests/view/components/controlledInputTest.js, ControlledInput ' +
'Test >', () => {
  var FIELD_NAME = 'cool_name_here';
  var FIELD_VALUE = 'cool_value_here';
  var NEW_FIELD_VALUE = 'happy_birthday';

  it('input renders with correct name, and default value', () => {
    // shallow renderer
    var renderer = TestUtils.createRenderer();

    renderer.render(
      <ControlledInput name={FIELD_NAME} value={FIELD_VALUE}/>
    );

    var inputHolder = renderer.getRenderOutput();
    var inputField = inputHolder.props.children.props;
    expect(inputField.value).to.equal(FIELD_VALUE);
    expect(inputField.name).to.equal(FIELD_NAME);
  });

  it('input, on initial render, has state name, value, identical to props name, value', () => {
    var inputField = TestUtils.renderIntoDocument(
      <ControlledInput name={FIELD_NAME} value={FIELD_VALUE}/>
    );
    expect(inputField.state.name).to.equal(inputField.props.name);
    expect(inputField.state.value).to.equal(inputField.props.value);
  });

  // needs React.render, as this gives test a specific mounted instance to change
  it('on input with new props, expect name and input value to be updated');

  // use ReactDOM.findDOMNode, not inputField directly, in Simulate.change
  it('on change, input value updates to new value', () => {
    var inputField = TestUtils.renderIntoDocument(
      <ControlledInput name={FIELD_NAME} value={FIELD_VALUE}/>
    );
    const domElement = ReactDOM.findDOMNode(inputField);
    domElement.value = NEW_FIELD_VALUE;

    TestUtils.Simulate.change(domElement,
      { target: { value: NEW_FIELD_VALUE } });
    expect(domElement.value).to.equal(NEW_FIELD_VALUE);
  });
});
