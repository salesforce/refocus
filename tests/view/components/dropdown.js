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
  const ONE = 1;
  const DUMMY_STRING = 'COOL';
  const DUMMY_FUNCTION = () => {};

  /**
   * Sets up the component with dummy prop values.
   * @param {Object} propAddons Optional object specifying
   * overrides to the default props
   * @returns {Object} The rendered component
   */
  function setup(propAddons) {
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
    };
    // update props as needed
    if (propAddons) {
      Object.assign(defaultProps, propAddons);
    }
    // use monut to test all lifecycle methods, and children
    const enzymeWrapper = mount(<Dropdown {...defaultProps} />);

    return enzymeWrapper;
  }

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
