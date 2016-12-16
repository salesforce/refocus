/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/view/components/dropdown.js
 */

import { expect } from 'chai';
import React from 'react';
import { mount } from 'enzyme';
import Dropdown from '../../../view/admin/components/common/Dropdown.js';

describe('Dropdown component tests', () => {
  const ZERO = 0;
  const ONE = 1;
  const DUMMY_STRING = 'COOL';
  const DUMMY_FUNCTION = () => {};

  /**
   * Sets up the component with dummy prop values.
   * @param {Object} propAddons Optional object specifying
   * overrides to the default props
   * @param {ReactElem} childElems The react elements
   * @returns {Object} The rendered component
   */
  function setup(propAddons, childElems) {
    const defaultProps = {
      options: [],
      dropDownStyle: {},
      newButtonText: DUMMY_STRING,
      title: DUMMY_STRING, // which dropdown
      allOptionsLabel: DUMMY_STRING,
      placeholderText: DUMMY_STRING,
      defaultValue: DUMMY_STRING,
      showSearchIcon: false,
      onAddNewButton: DUMMY_FUNCTION,
      onClickItem: DUMMY_FUNCTION,
      showInputElem: false, //default
    };
    // update props as needed
    if (propAddons) {
      Object.assign(defaultProps, propAddons);
    }
    // use monut to test all lifecycle methods, and children
    const enzymeWrapper = mount(
      <Dropdown {...defaultProps}>{childElems}</Dropdown>
    );
    return enzymeWrapper;
  }

  it('calling close from props closes the dropdown', () => {
    const enzymeWrapper = setup();
    const instance = enzymeWrapper.instance();
    instance.handleFocus(); // show the dropdown
    expect(instance.state.open).to.equal(true);
    enzymeWrapper.setProps({ close: true });
    expect(instance.state.open).to.equal(false);
  });

  it('when showInputElem is false and there are ' +
    'child element(s), there is no input rendered', () => {
    // by default, showInputElem = false
    const enzymeWrapper = setup({}, <div id='lookForMe'/>);
    expect(enzymeWrapper.find('.slds-lookup__search-input'))
      .to.have.length(ZERO);
  });

  it('even when showInputElem is false, if given no child elements, ' +
    'input is rendered', () => {
    // by default, showInputElem = false
    const enzymeWrapper = setup();
    expect(enzymeWrapper.find('.slds-lookup__search-input'))
      .to.have.length(ONE);
  });

  it('when showInputElem is true, an input is rendered with ' +
    'child element(s)', () => {
    // by default, showInputElem = false
    const enzymeWrapper = setup(
      { showInputElem: true },
      <div id='lookForMe'/>);
    expect(enzymeWrapper.find('.slds-lookup__search-input'))
      .to.have.length(ONE);
    expect(enzymeWrapper.find('#lookForMe')).to.have.length(ONE);
  });

  it('input is rendered by default', () => {
    const enzymeWrapper = setup();
    expect(enzymeWrapper.find('.slds-lookup__search-input'))
      .to.have.length(ONE);
  });

  it('on showSearchIcon: true, an icon is rendered', () => {
    const enzymeWrapper = setup({ showSearchIcon: true });
    expect(enzymeWrapper.find('.slds-button__icon'))
      .to.have.length(ONE);
  });
});
