/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/components/ButtonRowTest.js
 */
import { expect } from 'chai';
import React from 'react';
import ReactDOM from 'react-dom';
import TestUtils from 'react-addons-test-utils';
import ButtonRowWhenRead from '../../../view/admin/components/common/ButtonRowWhenRead.js';

describe('tests/view/components/ButtonRowTest.js, Button row >', () => {
  const parentAbsolutePath = 'PARENT';
  const dummyFunction = () => true;

  // If pass in null, delete will be disabled
  function setupReadButtonRow(deleteVal) {
    const props = {
      deleteResource: deleteVal,
      goBack: dummyFunction,
      setFormFieldToEdit: dummyFunction,
      addChildLink: dummyFunction,
    };

    const buttonRow = TestUtils.renderIntoDocument(
      <ButtonRowWhenRead {...props} />
    );

    return {
      props: props,
      buttonRow: buttonRow,
    };
  }

  it('on read, with no addChildProps, button row does not have add child button', () => {
    const props = {
      deleteResource: dummyFunction,
      goBack: dummyFunction,
      setFormFieldToEdit: dummyFunction,
    };
    const buttonRow = TestUtils.renderIntoDocument(
      <ButtonRowWhenRead {...props} />
    );
    var addChildButtons = TestUtils.scryRenderedDOMComponentsWithClass(buttonRow, 'addChildLink');
    expect(addChildButtons).to.be.empty;
  });

  it('on read, delete handler is defined through props', () => {
    const { buttonRow } = setupReadButtonRow(dummyFunction);
    var deleteButton = TestUtils.findRenderedDOMComponentWithClass(buttonRow, 'deleteButton');
    expect(deleteButton.onClick).to.be.defined;
  });

  it('on read, if delete handler is null, delete button should contain className disabled', () => {
    const { buttonRow } = setupReadButtonRow(null);
    var deleteButton = TestUtils.findRenderedDOMComponentWithClass(buttonRow, 'deleteButton');
    expect(deleteButton.onClick).to.not.be.defined;
    expect(deleteButton.disabled).to.be.true;
  });

  it('on read, props.addChild is passed in as on add child handler', () => {
    const { buttonRow } = setupReadButtonRow(null);
    var addChildButton = TestUtils.findRenderedDOMComponentWithClass(buttonRow, 'addChildLink');
    expect(addChildButton.onClick).to.be.defined;
  });
});
