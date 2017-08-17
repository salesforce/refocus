/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/components/formTest.js
 */

import React from 'react';
import ReactDOM from 'react-dom';
import TestUtils from 'react-addons-test-utils';
import { expect } from 'chai';
import CheckBoxComponent from '../../../view/admin/components/common/CheckBoxComponent.js';

describe('tests/view/components/checkBoxTest.js, CheckBoxComponent test >',
() => {
  const DUMMY_STRING = 'achoo';

  it('by default, checkbox is editable');

  it('props name is rendered correctly, as checkbox name', () => {
    const props = {
      name: DUMMY_STRING,
      disabled: true,
    };
    var checkBox = TestUtils.renderIntoDocument(
      <CheckBoxComponent {...props} />
    );

    expect(ReactDOM.findDOMNode(checkBox).name).to.equal(DUMMY_STRING);
  });

  it('checkbox renders as unchecked, by default, if no' +
    ' checked props passed in, and its state has checked as false', () => {
      const props = {
        disabled: true,
      };
      var checkBox = TestUtils.renderIntoDocument(
        <CheckBoxComponent {...props} />
      );

      expect(checkBox.state.checked).to.be.false;
    });

  it('checkbox on read, renders as expected given props is true', () => {
    const props = {
      disabled: true,
      checked: true,
    };
    var checkBox = TestUtils.renderIntoDocument(
      <CheckBoxComponent {...props} />
    );
    expect(ReactDOM.findDOMNode(checkBox).checked).to.be.true;
  });

  it('checkbox on read, renders as expected given props is false', () => {
    const props = {
      disabled: true,
      checked: false,
    };
    var checkBox = TestUtils.renderIntoDocument(
      <CheckBoxComponent {...props} />
    );
    expect(ReactDOM.findDOMNode(checkBox).checked).to.be.false;
  });

  it('checkbox on read, clicking does not change state')

  it('checkbox on edit, renders default value as expected given props is' +
    ' true', () => {
    const props = {
      disabled: false,
      checked: true,
    };
    var checkBox = TestUtils.renderIntoDocument(
      <CheckBoxComponent {...props} />
    );
    expect(ReactDOM.findDOMNode(checkBox).checked).to.be.true;
  });

  it('checkbox on edit, renders default value as expected given props is' +
    ' false', () => {
    const props = {
      disabled: false,
      checked: false,
    };
    var checkBox = TestUtils.renderIntoDocument(
      <CheckBoxComponent {...props} />
    );
    expect(ReactDOM.findDOMNode(checkBox).checked).to.be.false;
  });

  // TODO: change click to actually change value
  it('checkbox on edit, click once yields the opposite value as default' +
    ' value');

  it('checkbox on edit, click twice yields the same value as default');

});
